import 'server-only'

import { ConnectionError } from './errors'
import type { ConnectionProfile } from './types'

const API_ORIGIN = 'https://api.orderonline.id'

function record(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown> : null
}

function text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : null
}

// Explicit allowlist: neither arbitrary provider fields nor bank/credit data
// can enter the stored snapshot or cross the Server Component boundary.
export function normalizeOrderOnlineProfile(value: unknown): ConnectionProfile {
    const data = record(value)
    const userId = text(data?.user_id)
    if (!data || !userId || (data.user_id as string).trim().length > 500
        || (typeof data.parent_id === 'string' && data.parent_id.trim().length > 500)) {
        throw new ConnectionError('invalid_response', 'Profil OrderOnline tidak lengkap. Silakan coba lagi.')
    }
    return {
        schema_version: 1,
        user_id: userId,
        owner_id: text(data.parent_id) || userId,
        name: text(data.name),
        email: text(data.email),
        username: text(data.username),
        phone: text(data.phone),
        role: text(data.role),
        capabilities: Array.isArray(data.capabilities)
            ? data.capabilities.filter((item): item is string => typeof item === 'string').slice(0, 100).map(item => item.slice(0, 200))
            : [],
        is_active: typeof data.is_active === 'boolean' ? data.is_active : null,
        package: text(data.package),
        expired_date: text(data.expired_date),
    }
}

async function request(path: '/v1/auth' | '/v1/profile', init: RequestInit): Promise<Record<string, unknown>> {
    try {
        const response = await fetch(`${API_ORIGIN}${path}`, {
            ...init,
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(15_000),
        })
        if (path === '/v1/auth' && [400, 401, 403].includes(response.status)) {
            throw new ConnectionError('invalid_credentials', 'API key tidak valid atau akun OrderOnline tidak aktif.')
        }
        if ([401, 403, 404].includes(response.status)) {
            throw new ConnectionError('invalid_credentials', 'Profil OrderOnline tidak dapat diakses. Periksa API key dan status akun Anda.')
        }
        if (!response.ok) throw new ConnectionError('unavailable', 'OrderOnline sedang tidak dapat dihubungi. Silakan coba lagi.')
        let body: Record<string, unknown> | null
        try { body = record(await response.json()) }
        catch { throw new ConnectionError('invalid_response', 'Respons OrderOnline tidak sesuai. Silakan coba lagi.') }
        if (!body || (body.error_code !== undefined && body.error_code !== 0)) {
            throw new ConnectionError('invalid_response', 'Respons OrderOnline tidak sesuai. Silakan coba lagi.')
        }
        return body
    } catch (error) {
        if (error instanceof ConnectionError) throw error
        throw new ConnectionError('unavailable', 'Koneksi ke OrderOnline gagal atau kehabisan waktu. Silakan coba lagi.')
    }
}

export async function verifyOrderOnlineKey(apiKey: string): Promise<ConnectionProfile> {
    const auth = await request('/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token: apiKey }),
    })
    const token = record(auth.data)?.access_token
    if (typeof token !== 'string' || !token || token.length > 16384 || /[\r\n]/.test(token)) {
        throw new ConnectionError('invalid_response', 'OrderOnline tidak mengembalikan token akses yang valid.')
    }
    const response = await request('/v1/profile', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const profile = normalizeOrderOnlineProfile(response.data)
    if (profile.is_active === false) throw new ConnectionError('invalid_credentials', 'Akun OrderOnline tidak aktif.')
    return profile
}
