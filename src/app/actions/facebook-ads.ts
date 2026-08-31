'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface FacebookAdAccount {
    id: string           // e.g. "act_123456789"
    name: string
    accountId: string    // e.g. "123456789"
    currency: string     // e.g. "IDR", "USD"
}

export interface FacebookAdAccountsResult {
    success: boolean
    adAccounts?: FacebookAdAccount[]
    error?: string
    tokenExpired?: boolean
}

export interface FacebookAdsSpendResult {
    success: boolean
    spend?: number
    currency?: string
    error?: string
    tokenExpired?: boolean
}

export interface FacebookCampaign {
    id: string
    name: string
    status: string
}

export interface FacebookCampaignsResult {
    success: boolean
    campaigns?: FacebookCampaign[]
    error?: string
    tokenExpired?: boolean
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Fetch the stored Facebook access token for the current user.
 * Returns null if not connected or token is expired.
 */
async function getFacebookAccessToken(): Promise<{
    accessToken: string
    tokenExpired: boolean
} | null> {
    const session = await auth()
    if (!session?.user?.id) return null

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('oauth_identities')
        .select('access_token, token_expires_at')
        .eq('user_id', session.user.id)
        .eq('provider', 'facebook')
        .maybeSingle()

    if (error || !data?.access_token) return null

    // Check if token has expired
    if (data.token_expires_at) {
        const expiresAt = new Date(data.token_expires_at)
        if (expiresAt <= new Date()) {
            return { accessToken: '', tokenExpired: true }
        }
    }

    return { accessToken: data.access_token, tokenExpired: false }
}

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

/**
 * Get all Facebook ad accounts accessible by the current user.
 */
export async function getFacebookAdAccounts(): Promise<FacebookAdAccountsResult> {
    try {
        const tokenData = await getFacebookAccessToken()

        if (!tokenData) {
            return { success: false, error: 'Akun Facebook belum terhubung' }
        }

        if (tokenData.tokenExpired) {
            return {
                success: false,
                error: 'Token Facebook telah kedaluwarsa. Silakan hubungkan ulang.',
                tokenExpired: true,
            }
        }

        const url = new URL('https://graph.facebook.com/v20.0/me/adaccounts')
        url.searchParams.set('fields', 'id,name,account_id,currency')
        url.searchParams.set('access_token', tokenData.accessToken)

        const res = await fetch(url.toString(), { method: 'GET' })

        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}))
            return {
                success: false,
                error: errorBody?.error?.message || 'Gagal mengambil data akun iklan Facebook',
            }
        }

        const body = await res.json()
        const adAccounts: FacebookAdAccount[] = (body.data || []).map((item: any) => ({
            id: item.id,
            name: item.name || '',
            accountId: item.account_id || '',
            currency: item.currency || '',
        }))

        return { success: true, adAccounts }
    } catch (err) {
        console.error('Error fetching Facebook ad accounts:', err)
        return { success: false, error: 'Terjadi kesalahan saat mengambil data akun iklan' }
    }
}

/** Get all campaigns for an ad account. Pagination is handled on the server. */
export async function getFacebookCampaigns(adAccountId: string): Promise<FacebookCampaignsResult> {
    try {
        const tokenData = await getFacebookAccessToken()
        if (!tokenData) return { success: false, error: 'Akun Facebook belum terhubung' }
        if (tokenData.tokenExpired) {
            return { success: false, error: 'Token Facebook telah kedaluwarsa. Silakan hubungkan ulang.', tokenExpired: true }
        }

        const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
        let nextUrl: string | null = `https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=id,name,status&limit=100&access_token=${encodeURIComponent(tokenData.accessToken)}`
        const campaigns: FacebookCampaign[] = []

        // Defensive cap prevents an unexpected paging response from looping forever.
        for (let page = 0; nextUrl && page < 100; page++) {
            const res: Response = await fetch(nextUrl, { method: 'GET' })
            const body: any = await res.json().catch(() => ({}))
            if (!res.ok) {
                if (body?.error?.code === 190 || body?.error?.code === 102) {
                    return { success: false, error: 'Token Facebook telah kedaluwarsa. Silakan hubungkan ulang.', tokenExpired: true }
                }
                return { success: false, error: body?.error?.message || 'Gagal mengambil data campaign Facebook' }
            }

            campaigns.push(...(body.data || []).map((item: any) => ({
                id: item.id,
                name: item.name || '',
                status: item.status || '',
            })))
            nextUrl = body.paging?.next || null
        }

        return { success: true, campaigns }
    } catch (err) {
        console.error('Error fetching Facebook campaigns:', err)
        return { success: false, error: 'Terjadi kesalahan saat mengambil data campaign' }
    }
}

/**
 * Get the total ad spend for a specific date (or date range) for a given ad account.
 * The ad account ID should be in the format "act_XXXXX" or just the numeric ID.
 * If endDate is provided, FB API returns the summed spend across the entire range.
 */
export async function getFacebookAdsSpend(
    adAccountId: string,
    date: string,
    endDate?: string,
    campaignId?: string
): Promise<FacebookAdsSpendResult> {
    try {
        const tokenData = await getFacebookAccessToken()

        if (!tokenData) {
            return { success: false, error: 'Akun Facebook belum terhubung' }
        }

        if (tokenData.tokenExpired) {
            return {
                success: false,
                error: 'Token Facebook telah kedaluwarsa. Silakan hubungkan ulang.',
                tokenExpired: true,
            }
        }

        // Normalize ad account ID: if it already starts with "act_", use as-is
        const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

        const url = new URL(`https://graph.facebook.com/v20.0/${campaignId || accountId}/insights`)
        url.searchParams.set('fields', 'spend,account_currency')
        if (!campaignId) url.searchParams.set('level', 'account')
        url.searchParams.set('time_range', JSON.stringify({ since: date, until: endDate ?? date }))
        url.searchParams.set('access_token', tokenData.accessToken)

        const res = await fetch(url.toString(), { method: 'GET' })

        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}))
            // If token invalid, mark as expired
            if (errorBody?.error?.code === 190 || errorBody?.error?.code === 102) {
                return {
                    success: false,
                    error: 'Token Facebook telah kedaluwarsa. Silakan hubungkan ulang.',
                    tokenExpired: true,
                }
            }
            return {
                success: false,
                error: errorBody?.error?.message || 'Gagal mengambil data spend Facebook',
            }
        }

        const body = await res.json()
        const data = body.data || []

        // If no data for that date, spend is 0
        const spend = data.length > 0 ? parseFloat(data[0].spend || '0') : 0
        const currency = data.length > 0 ? (data[0].account_currency || 'IDR') : 'IDR'

        return { success: true, spend, currency }
    } catch (err) {
        console.error('Error fetching Facebook ads spend:', err)
        return { success: false, error: 'Terjadi kesalahan saat mengambil data spend' }
    }
}
