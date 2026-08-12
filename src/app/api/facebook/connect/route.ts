import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { createFacebookOAuthState, getFacebookOAuthConfig } from '@/lib/facebook-oauth'

export async function GET(request: NextRequest) {
    const requestOrigin = request.nextUrl.origin
    const appBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || requestOrigin

    const session = await auth()

    if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/login', appBaseUrl))
    }

    const config = getFacebookOAuthConfig(requestOrigin)
    if (!config) {
        return NextResponse.redirect(new URL('/settings?fb=error', appBaseUrl))
    }

    const state = createFacebookOAuthState(session.user.id)

    const oauthUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth')
    oauthUrl.searchParams.set('client_id', config.appId)
    oauthUrl.searchParams.set('redirect_uri', config.redirectUri)
    oauthUrl.searchParams.set('state', state)
    oauthUrl.searchParams.set('response_type', 'code')
    oauthUrl.searchParams.set('config_id', config.configId)
    oauthUrl.searchParams.set('scope', 'ads_read')

    return NextResponse.redirect(oauthUrl)
}
