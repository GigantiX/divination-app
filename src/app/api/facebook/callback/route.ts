import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFacebookOAuthConfig, validateFacebookOAuthState } from '@/lib/facebook-oauth'

type FacebookTokenResponse = {
    access_token: string
    token_type: string
    expires_in: number
}

type FacebookLongLivedTokenResponse = {
    access_token: string
    token_type: string
    expires_in: number
}

type FacebookMeResponse = {
    id: string
    name?: string
    email?: string
}

function getAppBaseUrl(request: NextRequest) {
    return process.env.APP_BASE_URL || request.nextUrl.origin
}

export async function GET(request: NextRequest) {
    const appBaseUrl = getAppBaseUrl(request)
    const session = await auth()

    if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/login', appBaseUrl))
    }

    const config = getFacebookOAuthConfig()
    if (!config) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const oauthError = url.searchParams.get('error')

    if (oauthError || !code || !state) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    const stateValid = validateFacebookOAuthState(state, session.user.id)
    if (!stateValid) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', config.appId)
    tokenUrl.searchParams.set('client_secret', config.appSecret)
    tokenUrl.searchParams.set('redirect_uri', config.redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString(), { method: 'GET' })
    if (!tokenRes.ok) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    const tokenData = await tokenRes.json() as FacebookTokenResponse
    if (!tokenData.access_token) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    // Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
    longLivedTokenUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedTokenUrl.searchParams.set('client_id', config.appId)
    longLivedTokenUrl.searchParams.set('client_secret', config.appSecret)
    longLivedTokenUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

    const longLivedTokenRes = await fetch(longLivedTokenUrl.toString(), { method: 'GET' })

    let accessToken = tokenData.access_token
    let tokenExpiresAt: string | null = null

    if (longLivedTokenRes.ok) {
        const longLivedData = await longLivedTokenRes.json() as FacebookLongLivedTokenResponse
        if (longLivedData.access_token) {
            accessToken = longLivedData.access_token
            // Calculate expiration date from expires_in (seconds)
            if (longLivedData.expires_in) {
                const expiresAt = new Date()
                expiresAt.setSeconds(expiresAt.getSeconds() + longLivedData.expires_in)
                tokenExpiresAt = expiresAt.toISOString()
            }
        }
    }

    const meUrl = new URL('https://graph.facebook.com/me')
    meUrl.searchParams.set('fields', 'id,name,email')
    meUrl.searchParams.set('access_token', accessToken)

    const meRes = await fetch(meUrl.toString(), { method: 'GET' })
    if (!meRes.ok) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    const meData = await meRes.json() as FacebookMeResponse
    if (!meData.id) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    const supabase = createAdminClient()

    const { data: existingProviderAccount, error: existingProviderError } = await supabase
        .from('oauth_identities')
        .select('user_id')
        .eq('provider', 'facebook')
        .eq('provider_user_id', meData.id)
        .maybeSingle()

    if (existingProviderError) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    if (existingProviderAccount && existingProviderAccount.user_id !== session.user.id) {
        return NextResponse.redirect(new URL('/settings?fb=already-linked', appBaseUrl))
    }

    const { error: upsertError } = await supabase
        .from('oauth_identities')
        .upsert(
            {
                user_id: session.user.id,
                provider: 'facebook',
                provider_user_id: meData.id,
                provider_email: meData.email || null,
                provider_name: meData.name || null,
                access_token: accessToken,
                token_expires_at: tokenExpiresAt,
                connected_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,provider' }
        )

    if (upsertError) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    return NextResponse.redirect(new URL('/settings?fb=connected', appBaseUrl))
}
