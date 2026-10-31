import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { credentialFingerprint, createVerificationReceipt, decryptCredential, encryptCredential, verifyReceipt } from './credentials'

const KEY = Buffer.alloc(32, 1).toString('base64')
const NEXT_KEY = Buffer.alloc(32, 2).toString('base64')
const secret = 'test-personal-access-token'
const expected = { actor: 'actor-1', provider: 'orderonline' as const, fingerprint: 'private-database-fingerprint', target: null, version: null }

beforeEach(() => {
    vi.stubEnv('CONNECTED_APPS_ENCRYPTION_KEYS', JSON.stringify({ v1: KEY }))
    vi.stubEnv('CONNECTED_APPS_ENCRYPTION_KEY_VERSION', 'v1')
    vi.stubEnv('CONNECTED_APPS_HMAC_SECRET', Buffer.alloc(32, 3).toString('base64'))
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('encrypted connected-app credentials', () => {
    it('round trips with unique nonces, without storing plaintext', () => {
        const first = encryptCredential(secret, 'connection-1')
        const second = encryptCredential(secret, 'connection-1')
        expect(first).not.toEqual(second)
        expect(JSON.stringify(first)).not.toContain(secret)
        expect(decryptCredential(first, 'connection-1')).toBe(secret)
    })

    it('rejects tampering and ciphertext copied to another connection', () => {
        const encrypted = encryptCredential(secret, 'connection-1')
        expect(() => decryptCredential(encrypted, 'connection-2')).toThrow('tidak dapat dibaca')
        expect(() => decryptCredential({ ...encrypted, credential_tag: Buffer.alloc(16).toString('base64') }, 'connection-1')).toThrow()
    })

    it('reads old versions during rotation and fails closed without the correct key', () => {
        const old = encryptCredential(secret, 'connection-1')
        vi.stubEnv('CONNECTED_APPS_ENCRYPTION_KEYS', JSON.stringify({ v1: KEY, v2: NEXT_KEY }))
        vi.stubEnv('CONNECTED_APPS_ENCRYPTION_KEY_VERSION', 'v2')
        expect(encryptCredential(secret, 'connection-1').credential_key_version).toBe('v2')
        expect(decryptCredential(old, 'connection-1')).toBe(secret)
        vi.stubEnv('CONNECTED_APPS_ENCRYPTION_KEYS', JSON.stringify({ v1: NEXT_KEY }))
        expect(() => decryptCredential(old, 'connection-1')).toThrow()
    })

    it('rejects missing/malformed configuration instead of storing unencrypted keys', () => {
        vi.stubEnv('CONNECTED_APPS_ENCRYPTION_KEYS', '{}')
        expect(() => encryptCredential(secret, 'connection-1')).toThrow('belum dikonfigurasi')
        vi.stubEnv('CONNECTED_APPS_HMAC_SECRET', 'not-base64')
        expect(() => credentialFingerprint(secret)).toThrow('belum dikonfigurasi')
    })
})

describe('Check → Save verification binding', () => {
    function create() { return createVerificationReceipt({ ...expected, user: 'oo-user', owner: 'oo-owner' }) }

    it('binds the receipt without revealing the key or stored fingerprint', () => {
        const { receipt } = create()
        expect(verifyReceipt(receipt, expected).user).toBe('oo-user')
        const payload = Buffer.from(receipt.split('.')[0], 'base64url').toString()
        expect(payload).not.toContain(expected.fingerprint)
        expect(payload).not.toContain(secret)
    })

    it.each([
        { actor: 'another-actor' }, { fingerprint: 'another-key' },
        { target: 'another-connection' }, { version: 2 },
    ])('rejects a substituted actor, key, target, or version: %j', change => {
        expect(() => verifyReceipt(create().receipt, { ...expected, ...change })).toThrow('Verifikasi tidak berlaku')
    })

    it('rejects a changed signature and expired receipts', () => {
        vi.useFakeTimers()
        const { receipt } = create()
        expect(() => verifyReceipt(receipt + 'x', expected)).toThrow()
        vi.advanceTimersByTime(10 * 60 * 1000 + 1)
        expect(() => verifyReceipt(receipt, expected)).toThrow('Verifikasi tidak berlaku')
    })
})
