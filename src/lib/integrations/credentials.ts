import 'server-only'

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { ConnectionError } from './errors'

export interface EncryptedCredential {
    credential_ciphertext: string
    credential_nonce: string
    credential_tag: string
    credential_key_version: string
}

export interface VerificationReceipt {
    actor: string
    provider: 'orderonline'
    fingerprint: string
    user: string
    owner: string
    target: string | null
    version: number | null
    expiresAt: number
}

function configurationError(): never {
    throw new ConnectionError('configuration', 'Penyimpanan API key belum dikonfigurasi. Hubungi developer.')
}

function decodeKey(value: unknown): Buffer {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value)) configurationError()
    const key = Buffer.from(value, 'base64')
    if (key.length !== 32 || key.toString('base64') !== value) configurationError()
    return key
}

function encryptionKey(version: string): Buffer {
    try {
        const keys: unknown = JSON.parse(process.env.CONNECTED_APPS_ENCRYPTION_KEYS || '')
        if (!keys || typeof keys !== 'object' || Array.isArray(keys)) configurationError()
        return decodeKey((keys as Record<string, unknown>)[version])
    } catch {
        return configurationError()
    }
}

function hmac(value: string): string {
    const secret = decodeKey(process.env.CONNECTED_APPS_HMAC_SECRET)
    return createHmac('sha256', secret).update(value).digest('base64url')
}

export function assertCredentialConfiguration(): void {
    const version = process.env.CONNECTED_APPS_ENCRYPTION_KEY_VERSION || 'v1'
    encryptionKey(version)
    hmac('configuration-check')
}

export function credentialFingerprint(apiKey: string): string {
    return hmac(`connected-apps:fingerprint:orderonline:${apiKey}`)
}

export function encryptCredential(apiKey: string, connectionId: string): EncryptedCredential {
    const version = process.env.CONNECTED_APPS_ENCRYPTION_KEY_VERSION || 'v1'
    const nonce = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(version), nonce)
    cipher.setAAD(Buffer.from(`connected-apps:orderonline:${connectionId}`))
    const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()])
    return {
        credential_ciphertext: ciphertext.toString('base64'),
        credential_nonce: nonce.toString('base64'),
        credential_tag: cipher.getAuthTag().toString('base64'),
        credential_key_version: version,
    }
}

export function decryptCredential(encrypted: EncryptedCredential, connectionId: string): string {
    const key = encryptionKey(encrypted.credential_key_version)
    try {
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.credential_nonce, 'base64'))
        decipher.setAAD(Buffer.from(`connected-apps:orderonline:${connectionId}`))
        decipher.setAuthTag(Buffer.from(encrypted.credential_tag, 'base64'))
        return Buffer.concat([
            decipher.update(Buffer.from(encrypted.credential_ciphertext, 'base64')),
            decipher.final(),
        ]).toString('utf8')
    } catch {
        throw new ConnectionError('configuration', 'API key tersimpan tidak dapat dibaca. Hubungi developer atau ganti API key.')
    }
}

export function createVerificationReceipt(receipt: Omit<VerificationReceipt, 'expiresAt'>): { receipt: string; expiresAt: number } {
    const expiresAt = Date.now() + 10 * 60 * 1000
    // Bind the candidate without exposing the fingerprint used by the database.
    const payload = Buffer.from(JSON.stringify({ ...receipt, fingerprint: hmac(`connected-apps:receipt-key:${receipt.fingerprint}`), expiresAt })).toString('base64url')
    return { receipt: `${payload}.${hmac(`connected-apps:verification:${payload}`)}`, expiresAt }
}

export function verifyReceipt(
    receipt: unknown,
    expected: Pick<VerificationReceipt, 'actor' | 'provider' | 'fingerprint' | 'target' | 'version'>,
): VerificationReceipt {
    const fail = (): never => {
        throw new ConnectionError('verification_expired', 'Verifikasi tidak berlaku. Klik Check Connection lagi.')
    }
    if (typeof receipt !== 'string' || receipt.length > 8192) fail()
    const parts = (receipt as string).split('.')
    if (parts.length !== 2) fail()
    const [payload, signature] = parts
    const actual = Buffer.from(signature)
    const wanted = Buffer.from(hmac(`connected-apps:verification:${payload}`))
    if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) fail()
    let data: VerificationReceipt
    try {
        data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    } catch {
        return fail()
    }
    if (!data || typeof data !== 'object'
        || typeof data.user !== 'string' || !data.user
        || typeof data.owner !== 'string' || !data.owner
        || typeof data.expiresAt !== 'number' || data.expiresAt <= Date.now()
        || data.expiresAt > Date.now() + 10 * 60 * 1000
        || Object.entries(expected).some(([key, value]) => data[key as keyof VerificationReceipt] !== (key === 'fingerprint' ? hmac(`connected-apps:receipt-key:${value}`) : value))) fail()
    return data
}
