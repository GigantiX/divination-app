import crypto from 'node:crypto'

type OAuthStatePayload = {
    userId: string
    nonce: string
    issuedAt: number
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000

function getStateSecret() {
    return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
}

function encodePayload(payload: OAuthStatePayload) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodePayload(encodedPayload: string): OAuthStatePayload | null {
    try {
        const raw = Buffer.from(encodedPayload, 'base64url').toString('utf-8')
        const parsed = JSON.parse(raw) as OAuthStatePayload

        if (!parsed.userId || !parsed.nonce || typeof parsed.issuedAt !== 'number') {
            return null
        }

        return parsed
    } catch {
        return null
    }
}

function signPayload(encodedPayload: string, secret: string) {
    return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

export function createFacebookOAuthState(userId: string) {
    const secret = getStateSecret()
    if (!secret) {
        throw new Error('AUTH_SECRET is required for Facebook OAuth state signing')
    }

    const payload: OAuthStatePayload = {
        userId,
        nonce: crypto.randomUUID(),
        issuedAt: Date.now(),
    }

    const encodedPayload = encodePayload(payload)
    const signature = signPayload(encodedPayload, secret)

    return `${encodedPayload}.${signature}`
}

export function validateFacebookOAuthState(state: string, expectedUserId: string) {
    const secret = getStateSecret()
    if (!secret) {
        return false
    }

    const parts = state.split('.')
    if (parts.length !== 2) {
        return false
    }

    const [encodedPayload, signature] = parts
    if (!encodedPayload || !signature) {
        return false
    }

    const expectedSignature = signPayload(encodedPayload, secret)
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (signatureBuffer.length !== expectedBuffer.length) {
        return false
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return false
    }

    const payload = decodePayload(encodedPayload)
    if (!payload) {
        return false
    }

    if (payload.userId !== expectedUserId) {
        return false
    }

    if (Date.now() - payload.issuedAt > STATE_MAX_AGE_MS) {
        return false
    }

    return true
}

export function getFacebookOAuthConfig() {
    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET
    const appBaseUrl = process.env.APP_BASE_URL
    const configId = process.env.FACEBOOK_CONFIG_ID
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || (appBaseUrl ? `${appBaseUrl}/api/facebook/callback` : undefined)

    if (!appId || !appSecret || !redirectUri || !configId) {
        return null
    }

    return {
        appId,
        appSecret,
        redirectUri,
        configId,
    }
}
