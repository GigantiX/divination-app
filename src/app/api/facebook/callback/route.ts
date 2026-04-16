import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFacebookOAuthConfig, validateFacebookOAuthState } from '@/lib/facebook-oauth'

type FacebookTokenResponse = {
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

    const meUrl = new URL('https://graph.facebook.com/me')
    meUrl.searchParams.set('fields', 'id,name,email')
    meUrl.searchParams.set('access_token', tokenData.access_token)

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
                connected_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,provider' }
        )

    if (upsertError) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    return NextResponse.redirect(new URL('/settings?fb=connected', appBaseUrl))
}
