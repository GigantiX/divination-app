import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { createFacebookOAuthState, getFacebookOAuthConfig } from '@/lib/facebook-oauth'

export async function GET() {
    const session = await auth()

    if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/login', process.env.APP_BASE_URL || 'http://localhost:3000'))
    }

    const config = getFacebookOAuthConfig()
    if (!config) {
        return NextResponse.redirect(new URL('/settings?fb=error', process.env.APP_BASE_URL || 'http://localhost:3000'))
    }

    const state = createFacebookOAuthState(session.user.id)

    const oauthUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth')
    oauthUrl.searchParams.set('client_id', config.appId)
    oauthUrl.searchParams.set('redirect_uri', config.redirectUri)
    oauthUrl.searchParams.set('state', state)
    oauthUrl.searchParams.set('response_type', 'code')
    oauthUrl.searchParams.set('config_id', config.configId)

    return NextResponse.redirect(oauthUrl)
}
