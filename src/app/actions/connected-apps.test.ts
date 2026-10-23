import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/integrations/orderonline', async importOriginal => ({
    ...await importOriginal<typeof import('@/lib/integrations/orderonline')>(),
    verifyOrderOnlineKey: vi.fn(),
}))

import { auth } from '@/auth'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'
import { createVerificationReceipt, credentialFingerprint, decryptCredential, encryptCredential } from '@/lib/integrations/credentials'
import { verifyOrderOnlineKey } from '@/lib/integrations/orderonline'
import { ConnectionError } from '@/lib/integrations/errors'
import type { ConnectionProfile } from '@/lib/integrations/types'
import { checkConnectedApp, disconnectConnectedApp, getConnectedApps, recheckConnectedApp, renameConnectedApp, saveConnectedApp } from './connected-apps'

const ID = 'a1111111-1111-4111-8111-111111111111'
const ACTOR = 'b2222222-2222-4222-8222-222222222222'
const API_KEY = 'test-personal-access-token'
const profile: ConnectionProfile = {
    schema_version: 1, user_id: 'user-oo', owner_id: 'owner-oo', name: 'Test Owner',
    email: 'test@example.com', username: 'test-store', phone: null, role: 'staff',
    capabilities: [], is_active: true, package: 'premium', expired_date: null,
}
const candidate = { provider: 'orderonline', name: 'Store API', apiKey: API_KEY }

function row(changes: Record<string, unknown> = {}) {
    return {
        id: ID, provider: 'orderonline', name: 'Store API', external_user_id: profile.user_id,
        external_owner_id: profile.owner_id, profile_snapshot: profile, key_hint: '•••• oken',
        status: 'connected', last_check_outcome: 'success',
        last_checked_at: '2026-10-22T00:00:00Z', last_verified_at: '2026-10-22T00:00:00Z',
        created_at: '2026-10-22T00:00:00Z', version: 1,
        ...encryptCredential(API_KEY, ID), credential_fingerprint: credentialFingerprint(API_KEY),
        ...changes,
    }
}

function database(builders: MockQueryBuilder[] = [], role = 'admin') {
    const queue = [...builders]
    vi.mocked(mockSupabaseClient.from).mockImplementation(table => {
        if (table === 'profiles') return new MockQueryBuilder({ role })
        if (table === 'connected_apps') return queue.shift() || new MockQueryBuilder(null)
        throw new Error(`Unexpected table: ${table}`)
    })
}

function receipt(changes: Record<string, unknown> = {}) {
    return createVerificationReceipt({
        actor: ACTOR, provider: 'orderonline', fingerprint: credentialFingerprint(API_KEY),
        user: profile.user_id, owner: profile.owner_id, target: null, version: null, ...changes,
    }).receipt
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CONNECTED_APPS_ENCRYPTION_KEYS', JSON.stringify({ v1: Buffer.alloc(32, 1).toString('base64') }))
    vi.stubEnv('CONNECTED_APPS_ENCRYPTION_KEY_VERSION', 'v1')
    vi.stubEnv('CONNECTED_APPS_HMAC_SECRET', Buffer.alloc(32, 2).toString('base64'))
    vi.mocked(auth).mockResolvedValue({ user: { id: ACTOR, role: 'admin' } } as never)
    vi.mocked(verifyOrderOnlineKey).mockResolvedValue(profile)
    database()
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('Connected Apps authorization and safe metadata', () => {
    it.each(['user', 'missing-role'])('denies every operation using the fresh database role (%s)', async role => {
        database([], role)
        const results = await Promise.all([
            getConnectedApps(), checkConnectedApp(candidate), saveConnectedApp({ ...candidate, receipt: 'forged' }),
            renameConnectedApp(ID, 1, 'Rename'), disconnectConnectedApp(ID, 1), recheckConnectedApp(ID, 1),
        ])
        expect(results.every(result => !result.success && result.code === 'forbidden')).toBe(true)
        expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('connected_apps')
        expect(verifyOrderOnlineKey).not.toHaveBeenCalled()
    })

    it('rejects signed-out callers without database access', async () => {
        vi.mocked(auth).mockResolvedValue(null as never)
        expect(await getConnectedApps()).toMatchObject({ success: false, code: 'unauthenticated' })
        expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it.each(['admin', 'developer'])('returns a shared safe projection for %s', async role => {
        const query = new MockQueryBuilder([row()])
        database([query], role)
        const result = await getConnectedApps()
        expect(result).toMatchObject({ success: true, data: [{ id: ID, profile: { owner_id: profile.owner_id } }] })
        expect(query.eq).not.toHaveBeenCalledWith('created_by', ACTOR)
        expect(query.select.mock.calls[0][0]).not.toContain('credential_')
        expect(JSON.stringify(result)).not.toMatch(/credential_ciphertext|credential_fingerprint|credential_nonce|credential_tag|test-personal-access-token/)
    })
})

describe('Check and Save', () => {
    it('verifies without persisting and warns when another key accesses the same account', async () => {
        const duplicate = new MockQueryBuilder(null)
        const peers = new MockQueryBuilder([{ id: 'other-key' }])
        database([duplicate, peers])
        const result = await checkConnectedApp(candidate)
        expect(result).toMatchObject({ success: true, data: { profile, sameAccountExists: true } })
        expect(duplicate.insert).not.toHaveBeenCalled()
        expect(peers.insert).not.toHaveBeenCalled()
        expect(verifyOrderOnlineKey).toHaveBeenCalledWith(API_KEY)
    })

    it('persists encrypted key and server-fetched profile as one row', async () => {
        const insert = new MockQueryBuilder(row())
        database([new MockQueryBuilder(null), insert])
        const result = await saveConnectedApp({ ...candidate, receipt: receipt() })
        expect(result.success).toBe(true)
        const saved = insert.insert.mock.calls[0][0]
        expect(saved.profile_snapshot).toEqual(profile)
        expect(saved.created_by).toBe(ACTOR)
        expect(decryptCredential(saved, saved.id)).toBe(API_KEY)
        expect(JSON.stringify(saved)).not.toContain(API_KEY)
        expect(JSON.stringify(result)).not.toContain('credential_')
        expect(verifyOrderOnlineKey).toHaveBeenCalledWith(API_KEY)
    })

    it.each(['berdu', 'scalev', 'sejoli'])('rejects disabled providers on the backend (%s)', async provider => {
        expect(await checkConnectedApp({ ...candidate, provider })).toMatchObject({ success: false, code: 'validation' })
        expect(verifyOrderOnlineKey).not.toHaveBeenCalled()
    })

    it('rejects a key substituted after Check and forged/expired receipts', async () => {
        const valid = receipt()
        for (const input of [{ ...candidate, apiKey: 'another-key', receipt: valid }, { ...candidate, receipt: 'forged' }]) {
            expect(await saveConnectedApp(input)).toMatchObject({ success: false, code: 'verification_expired' })
        }
        vi.useFakeTimers()
        const expiring = receipt()
        vi.advanceTimersByTime(600001)
        expect(await saveConnectedApp({ ...candidate, receipt: expiring })).toMatchObject({ success: false, code: 'verification_expired' })
        expect(verifyOrderOnlineKey).not.toHaveBeenCalled()
    })

    it('rejects identity changes between preview and Save', async () => {
        database([new MockQueryBuilder(null)])
        vi.mocked(verifyOrderOnlineKey).mockResolvedValue({ ...profile, owner_id: 'another-owner' })
        expect(await saveConnectedApp({ ...candidate, receipt: receipt() })).toMatchObject({ success: false, code: 'identity_mismatch' })
        expect(mockSupabaseClient.from.mock.calls.filter(([table]) => table === 'connected_apps')).toHaveLength(1)
    })

    it('rejects duplicate keys before upstream verification', async () => {
        database([new MockQueryBuilder({ id: 'already-saved' })])
        expect(await checkConnectedApp(candidate)).toMatchObject({ success: false, code: 'duplicate' })
        expect(verifyOrderOnlineKey).not.toHaveBeenCalled()
    })

    it('handles simultaneous duplicate saves through the database constraint', async () => {
        database([new MockQueryBuilder(null), new MockQueryBuilder(null, { code: '23505', message: 'never return SDK details' })])
        expect(await saveConnectedApp({ ...candidate, receipt: receipt() })).toMatchObject({ success: false, code: 'duplicate' })
    })

    it('reports a database failure without exposing SDK error details', async () => {
        database([new MockQueryBuilder(null), new MockQueryBuilder(null, { code: '500', message: 'raw-key=private' })])
        const result = await saveConnectedApp({ ...candidate, receipt: receipt() })
        expect(result).toMatchObject({ success: false, code: 'database' })
        expect(JSON.stringify(result)).not.toContain('raw-key')
    })
})

describe('saved connection lifecycle', () => {
    it('replaces a key after verification while preserving connection and account identity', async () => {
        const replacement = 'new-personal-access-token'
        const mutation = new MockQueryBuilder(row({ version: 2 }))
        database([new MockQueryBuilder(row()), new MockQueryBuilder(null), mutation])
        const replacementReceipt = receipt({ target: ID, version: 1, fingerprint: credentialFingerprint(replacement) })
        const result = await saveConnectedApp({ ...candidate, apiKey: replacement, connectionId: ID, version: 1, receipt: replacementReceipt })
        expect(result).toMatchObject({ success: true, data: { id: ID, profile: { user_id: profile.user_id } } })
        const values = mutation.update.mock.calls[0][0]
        expect(decryptCredential(values, ID)).toBe(replacement)
        expect(values).toMatchObject({ credential_fingerprint: credentialFingerprint(replacement), status: 'connected', version: 2 })
        expect(mutation.eq).toHaveBeenCalledWith('version', 1)
    })

    it('reconnects a disconnected record only through a new successful verification', async () => {
        const disconnected = row({ status: 'disconnected', credential_ciphertext: null })
        const mutation = new MockQueryBuilder(row({ version: 2 }))
        database([new MockQueryBuilder(disconnected), new MockQueryBuilder(null), mutation])
        const result = await saveConnectedApp({ ...candidate, connectionId: ID, version: 1, receipt: receipt({ target: ID, version: 1 }) })
        expect(result.success).toBe(true)
        expect(mutation.update.mock.calls[0][0]).toMatchObject({ status: 'connected', disconnected_at: null })
    })

    it('renames without requesting OrderOnline or changing credentials', async () => {
        const mutation = new MockQueryBuilder(row({ name: 'Renamed', version: 2 }))
        database([new MockQueryBuilder(row()), mutation])
        expect(await renameConnectedApp(ID, 1, ' Renamed ')).toMatchObject({ success: true, data: { name: 'Renamed' } })
        expect(mutation.update).toHaveBeenCalledWith({ name: 'Renamed', updated_by: ACTOR, version: 2 })
        expect(verifyOrderOnlineKey).not.toHaveBeenCalled()
    })

    it('decrypts a saved key for recheck and only returns safe metadata', async () => {
        const mutation = new MockQueryBuilder(row({ version: 2 }))
        database([new MockQueryBuilder(row()), mutation])
        const result = await recheckConnectedApp(ID, 1)
        expect(result.success).toBe(true)
        expect(verifyOrderOnlineKey).toHaveBeenCalledWith(API_KEY)
        expect(JSON.stringify(result)).not.toContain('credential_')
    })

    it.each([['unavailable', 'connected'], ['invalid_credentials', 'needs_attention']] as const)(
        'records %s accurately without erasing the last verified profile', async (code, status) => {
            const mutation = new MockQueryBuilder(row({ status, version: 2 }))
            database([new MockQueryBuilder(row()), mutation])
            vi.mocked(verifyOrderOnlineKey).mockRejectedValue(new ConnectionError(code, 'safe error'))
            expect(await recheckConnectedApp(ID, 1)).toMatchObject({ success: false, code })
            const values = mutation.update.mock.calls[0][0]
            expect(values).toMatchObject({ status, last_check_outcome: code })
            expect(values).not.toHaveProperty('profile_snapshot')
            expect(values).not.toHaveProperty('last_verified_at')
            expect(values).not.toHaveProperty('credential_ciphertext')
        },
    )

    it('preserves the previous usable key when a replacement check fails', async () => {
        const existing = new MockQueryBuilder(row())
        database([existing, new MockQueryBuilder(null)])
        vi.mocked(verifyOrderOnlineKey).mockRejectedValue(new ConnectionError('invalid_credentials', 'bad key'))
        expect(await checkConnectedApp({ ...candidate, apiKey: 'replacement-key', connectionId: ID, version: 1 })).toMatchObject({ success: false, code: 'invalid_credentials' })
        expect(existing.update).not.toHaveBeenCalled()
    })

    it('disconnects by clearing every credential field while retaining the profile', async () => {
        const mutation = new MockQueryBuilder(row({ status: 'disconnected', version: 2 }))
        database([new MockQueryBuilder(row()), mutation])
        expect(await disconnectConnectedApp(ID, 1)).toMatchObject({ success: true })
        expect(mutation.update.mock.calls[0][0]).toMatchObject({
            status: 'disconnected', credential_ciphertext: null, credential_nonce: null,
            credential_tag: null, credential_key_version: null, credential_fingerprint: null, key_hint: null,
        })
        expect(mutation.update.mock.calls[0][0]).not.toHaveProperty('profile_snapshot')
    })

    it('cannot recheck a disconnected connection', async () => {
        database([new MockQueryBuilder(row({ status: 'disconnected' }))])
        expect(await recheckConnectedApp(ID, 1)).toMatchObject({ success: false, code: 'disconnected' })
        expect(verifyOrderOnlineKey).not.toHaveBeenCalled()
    })

    it('does not let an in-flight recheck overwrite a disconnect or replacement', async () => {
        const mutation = new MockQueryBuilder(null)
        database([new MockQueryBuilder(row()), mutation])
        expect(await recheckConnectedApp(ID, 1)).toMatchObject({ success: false, code: 'conflict' })
        expect(mutation.eq).toHaveBeenCalledWith('version', 1)
    })

    it('rejects stale versions before making external requests', async () => {
        database([new MockQueryBuilder(row({ version: 2 }))])
        expect(await recheckConnectedApp(ID, 1)).toMatchObject({ success: false, code: 'conflict' })
        expect(verifyOrderOnlineKey).not.toHaveBeenCalled()
    })
})
