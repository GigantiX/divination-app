import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { normalizeOrderOnlineProfile, verifyOrderOnlineKey } from './orderonline'

const fetchMock = vi.fn()
const profile = { user_id: 'member-1', parent_id: 'owner-1', name: 'Test Store', email: 'test@example.com', role: 'staff', is_active: true }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => vi.unstubAllGlobals())

describe('OrderOnline auth/profile adapter', () => {
    it('exchanges the PAT for a JWT before reading profile and omits private/unrecognized fields', async () => {
        fetchMock.mockResolvedValueOnce(json({ data: { access_token: 'jwt-secret' }, error_code: 0 }))
            .mockResolvedValueOnce(json({ data: { ...profile, bank_accounts: [{ account_number: 'private-bank' }], credit: 100, access_token: 'leak' }, error_code: 0 }))
        const result = await verifyOrderOnlineKey('personal-key')
        expect(result.owner_id).toBe('owner-1')
        expect(result.user_id).toBe('member-1')
        expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.orderonline.id/v1/auth', expect.objectContaining({ method: 'POST', body: '{"token":"personal-key"}', cache: 'no-store', redirect: 'error' }))
        expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.orderonline.id/v1/profile', expect.objectContaining({ headers: { Authorization: 'Bearer jwt-secret', Accept: 'application/json' } }))
        expect(JSON.stringify(result)).not.toMatch(/private-bank|jwt-secret|access_token|credit/)
    })

    it('does not treat error_code zero as a successful HTTP request', async () => {
        fetchMock.mockResolvedValue(json({ error_code: 0, message: 'credential-containing-message' }, 400))
        await expect(verifyOrderOnlineKey('bad-key')).rejects.toMatchObject({ code: 'invalid_credentials' })
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it.each([401, 403])('explains an auth HTTP %s as an invalid/inactive API key', async status => {
        fetchMock.mockResolvedValue(json({}, status))
        await expect(verifyOrderOnlineKey('bad-key')).rejects.toMatchObject({ code: 'invalid_credentials', message: 'API key tidak valid atau akun OrderOnline tidak aktif.' })
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it.each([429, 500, 503])('classifies HTTP %s as temporary without leaking upstream text', async status => {
        fetchMock.mockResolvedValue(json({ message: 'secret-raw-error' }, status))
        await expect(verifyOrderOnlineKey('key')).rejects.toMatchObject({ code: 'unavailable' })
        await expect(verifyOrderOnlineKey('key')).rejects.not.toThrow('secret-raw-error')
    })

    it('rejects auth responses with no JWT and malformed JSON', async () => {
        fetchMock.mockResolvedValueOnce(json({ data: {} }))
        await expect(verifyOrderOnlineKey('key')).rejects.toMatchObject({ code: 'invalid_response' })
        fetchMock.mockResolvedValueOnce(new Response('<html>upstream failure</html>'))
        await expect(verifyOrderOnlineKey('key')).rejects.toMatchObject({ code: 'invalid_response' })
    })

    it.each([401, 404])('rejects profile HTTP %s', async status => {
        fetchMock.mockResolvedValueOnce(json({ data: { access_token: 'jwt' } })).mockResolvedValueOnce(json({}, status))
        await expect(verifyOrderOnlineKey('key')).rejects.toMatchObject({ code: 'invalid_credentials' })
    })

    it('rejects incomplete identity and inactive profiles', async () => {
        expect(() => normalizeOrderOnlineProfile({ name: 'Missing ID' })).toThrow()
        fetchMock.mockResolvedValueOnce(json({ data: { access_token: 'jwt' } })).mockResolvedValueOnce(json({ data: { ...profile, is_active: false } }))
        await expect(verifyOrderOnlineKey('key')).rejects.toMatchObject({ code: 'invalid_credentials' })
    })

    it('sanitizes network failures and allows missing optional profile fields', async () => {
        fetchMock.mockRejectedValueOnce(new Error('fetch failed with key=private'))
        await expect(verifyOrderOnlineKey('key')).rejects.toMatchObject({ code: 'unavailable' })
        expect(normalizeOrderOnlineProfile({ user_id: 'owner' })).toMatchObject({ user_id: 'owner', owner_id: 'owner', name: null, capabilities: [] })
    })
})
