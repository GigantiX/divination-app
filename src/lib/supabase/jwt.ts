import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
)

/**
 * Verify a Supabase JWT access token using asymmetric keys (JWKS)
 * This is the recommended approach for new Supabase projects
 */
export async function verifyAccessToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
            audience: 'authenticated',
        })
        return { success: true, payload }
    } catch (error) {
        console.error('Token verification failed:', error)
        return { success: false, error }
    }
}

/**
 * Extract user ID from a verified JWT payload
 */
export function getUserIdFromPayload(payload: Record<string, unknown>): string | null {
    return (payload.sub as string) || null
}

/**
 * Check if a JWT payload has a specific role
 */
export function hasRole(payload: Record<string, unknown>, role: string): boolean {
    const userRole = payload.role as string
    return userRole === role
}
