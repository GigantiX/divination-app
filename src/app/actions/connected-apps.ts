'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole, isAdminOrDeveloper } from '@/lib/authorization'
import { ConnectionError } from '@/lib/integrations/errors'
import {
    assertCredentialConfiguration, credentialFingerprint, createVerificationReceipt,
    decryptCredential, encryptCredential, verifyReceipt,
} from '@/lib/integrations/credentials'
import { normalizeOrderOnlineProfile, verifyOrderOnlineKey } from '@/lib/integrations/orderonline'
import type {
    CheckedConnection, CheckConnectionInput, ConnectedApp, ConnectionProfile,
    ConnectionResult, ConnectionStatus, SaveConnectionInput,
} from '@/lib/integrations/types'

type Database = ReturnType<typeof createAdminClient>
interface ConnectionRow {
    id: string
    provider: 'orderonline'
    name: string
    external_user_id: string
    external_owner_id: string
    profile_snapshot: ConnectionProfile
    key_hint: string | null
    status: ConnectionStatus
    last_check_outcome: string | null
    last_checked_at: string | null
    last_verified_at: string | null
    created_at: string
    version: number
    credential_ciphertext?: string | null
    credential_nonce?: string | null
    credential_tag?: string | null
    credential_key_version?: string | null
}

const SAFE_COLUMNS = 'id,provider,name,external_user_id,external_owner_id,profile_snapshot,key_hint,status,last_check_outcome,last_checked_at,last_verified_at,created_at,version'
const SECRET_COLUMNS = 'credential_ciphertext,credential_nonce,credential_tag,credential_key_version'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CONFLICT = 'Koneksi telah diubah. Muat ulang halaman lalu coba lagi.'

async function authorized<T>(work: (db: Database, actor: string) => Promise<T>): Promise<ConnectionResult<T>> {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new ConnectionError('unauthenticated', 'Silakan masuk terlebih dahulu.')
        const db = createAdminClient()
        if (!isAdminOrDeveloper(await getUserRole(db, session.user.id))) {
            throw new ConnectionError('forbidden', 'Hanya admin dan developer yang dapat mengelola Connected Apps.')
        }
        return { success: true, data: await work(db, session.user.id) }
    } catch (error) {
        if (error instanceof ConnectionError) return { success: false, code: error.code, error: error.message }
        // Never serialize/log SDK exceptions: they can contain credentials or upstream data.
        return { success: false, code: 'database', error: 'Connected Apps tidak dapat diproses. Silakan coba lagi.' }
    }
}

function projection(row: ConnectionRow): ConnectedApp {
    return {
        id: row.id, provider: row.provider, name: row.name,
        profile: normalizeOrderOnlineProfile({ ...row.profile_snapshot, user_id: row.external_user_id, parent_id: row.external_owner_id }),
        key_hint: row.key_hint, status: row.status,
        last_check_outcome: row.last_check_outcome,
        last_checked_at: row.last_checked_at, last_verified_at: row.last_verified_at,
        created_at: row.created_at, version: row.version,
    }
}

function validateTarget(id: unknown, version: unknown): asserts id is string {
    if (typeof id !== 'string' || !UUID.test(id) || !Number.isSafeInteger(version) || Number(version) < 1) {
        throw new ConnectionError('validation', 'Koneksi tidak valid. Muat ulang halaman.')
    }
}

function validateName(name: unknown): string {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
        throw new ConnectionError('validation', 'Nama koneksi wajib diisi, maksimal 100 karakter.')
    }
    return name.trim()
}

function validateCandidate(input: CheckConnectionInput) {
    if (!input || input.provider !== 'orderonline') {
        throw new ConnectionError('validation', 'Provider ini belum tersedia.')
    }
    const name = validateName(input.name)
    if (typeof input.apiKey !== 'string' || !input.apiKey.trim()
        || input.apiKey.length > 8192 || /[\x00-\x1f\x7f]/.test(input.apiKey.trim())) {
        throw new ConnectionError('validation', 'Masukkan API key yang valid, maksimal 8192 karakter.')
    }
    if (input.connectionId !== undefined) validateTarget(input.connectionId, input.version)
    else if (input.version !== undefined) throw new ConnectionError('validation', 'Koneksi tidak valid.')
    return { name, apiKey: input.apiKey.trim() }
}

function databaseError(error: { code?: string } | null): void {
    if (!error) return
    if (error.code === '23505') throw new ConnectionError('duplicate', 'API key ini sudah tersimpan di Connected Apps.')
    throw new ConnectionError('database', 'Data koneksi belum dapat disimpan atau dimuat. Silakan coba lagi.')
}

async function load(db: Database, id: string, version: number, secrets = false): Promise<ConnectionRow> {
    validateTarget(id, version)
    const { data, error } = await db.from('connected_apps')
        .select(secrets ? `${SAFE_COLUMNS},${SECRET_COLUMNS}` : SAFE_COLUMNS).eq('id', id).maybeSingle()
    databaseError(error)
    const row = data as unknown as ConnectionRow | null
    if (!row || row.provider !== 'orderonline') throw new ConnectionError('not_found', 'Koneksi tidak ditemukan.')
    if (row.version !== version) throw new ConnectionError('conflict', CONFLICT)
    return row
}

function assertIdentity(profile: ConnectionProfile, row: Pick<ConnectionRow, 'external_user_id' | 'external_owner_id'>): void {
    if (profile.user_id !== row.external_user_id || profile.owner_id !== row.external_owner_id) {
        throw new ConnectionError('identity_mismatch', 'API key terhubung ke identitas akun berbeda. Tambahkan sebagai koneksi baru.')
    }
}

async function checkDuplicate(db: Database, fingerprint: string, target?: string): Promise<void> {
    const { data, error } = await db.from('connected_apps').select('id')
        .eq('provider', 'orderonline').eq('credential_fingerprint', fingerprint).maybeSingle()
    databaseError(error)
    if (data && data.id !== target) throw new ConnectionError('duplicate', 'API key ini sudah tersimpan di Connected Apps.')
}

async function update(db: Database, row: ConnectionRow, actor: string, values: Record<string, unknown>): Promise<ConnectedApp> {
    const { data, error } = await db.from('connected_apps')
        .update({ ...values, updated_by: actor, version: row.version + 1 })
        .eq('id', row.id).eq('version', row.version).select(SAFE_COLUMNS).maybeSingle()
    databaseError(error)
    if (!data) throw new ConnectionError('conflict', CONFLICT)
    revalidatePath('/settings/connected-apps')
    return projection(data as ConnectionRow)
}

export async function getConnectedApps(): Promise<ConnectionResult<ConnectedApp[]>> {
    return authorized(async db => {
        const { data, error } = await db.from('connected_apps').select(SAFE_COLUMNS).order('created_at', { ascending: false })
        databaseError(error)
        return (data || []).map(row => projection(row as ConnectionRow))
    })
}

export async function checkConnectedApp(input: CheckConnectionInput): Promise<ConnectionResult<CheckedConnection>> {
    return authorized(async (db, actor) => {
        const { apiKey } = validateCandidate(input)
        assertCredentialConfiguration()
        const target = input.connectionId ? await load(db, input.connectionId, input.version!) : null
        const fingerprint = credentialFingerprint(apiKey)
        await checkDuplicate(db, fingerprint, target?.id)
        const profile = await verifyOrderOnlineKey(apiKey)
        if (target) assertIdentity(profile, target)
        const { data: peers, error } = await db.from('connected_apps').select('id')
            .eq('provider', 'orderonline').eq('external_owner_id', profile.owner_id)
            .in('status', ['connected', 'needs_attention'])
        databaseError(error)
        return {
            profile,
            ...createVerificationReceipt({
                actor, provider: 'orderonline', fingerprint,
                user: profile.user_id, owner: profile.owner_id,
                target: target?.id ?? null, version: target?.version ?? null,
            }),
            sameAccountExists: (peers || []).some(peer => peer.id !== target?.id),
        }
    })
}

export async function saveConnectedApp(input: SaveConnectionInput): Promise<ConnectionResult<ConnectedApp>> {
    return authorized(async (db, actor) => {
        const { name, apiKey } = validateCandidate(input)
        assertCredentialConfiguration()
        const fingerprint = credentialFingerprint(apiKey)
        const receipt = verifyReceipt(input.receipt, {
            actor, provider: 'orderonline', fingerprint,
            target: input.connectionId ?? null, version: input.version ?? null,
        })
        const target = input.connectionId ? await load(db, input.connectionId, input.version!) : null
        await checkDuplicate(db, fingerprint, target?.id)
        const profile = await verifyOrderOnlineKey(apiKey)
        assertIdentity(profile, { external_user_id: receipt.user, external_owner_id: receipt.owner })
        if (target) assertIdentity(profile, target)
        const id = target?.id ?? randomUUID()
        const now = new Date().toISOString()
        const values = {
            provider: 'orderonline', name,
            external_user_id: profile.user_id, external_owner_id: profile.owner_id,
            profile_snapshot: profile, ...encryptCredential(apiKey, id),
            credential_fingerprint: fingerprint,
            // A short key never gets displayed verbatim, even as a hint.
            key_hint: apiKey.length > 8 ? `•••• ${apiKey.slice(-4)}` : '••••',
            status: 'connected', last_check_outcome: 'success', last_check_error_code: null,
            last_checked_at: now, last_verified_at: now, disconnected_at: null,
        }
        if (target) return update(db, target, actor, values)
        const { data, error } = await db.from('connected_apps')
            .insert({ ...values, id, created_by: actor, updated_by: actor })
            .select(SAFE_COLUMNS).single()
        databaseError(error)
        if (!data) throw new ConnectionError('database', 'Koneksi belum tersimpan. Silakan coba lagi.')
        revalidatePath('/settings/connected-apps')
        return projection(data as ConnectionRow)
    })
}

export async function renameConnectedApp(id: string, version: number, name: string): Promise<ConnectionResult<ConnectedApp>> {
    return authorized(async (db, actor) => {
        const label = validateName(name)
        const row = await load(db, id, version)
        return update(db, row, actor, { name: label })
    })
}

export async function disconnectConnectedApp(id: string, version: number): Promise<ConnectionResult<ConnectedApp>> {
    return authorized(async (db, actor) => {
        const row = await load(db, id, version)
        if (row.status === 'disconnected') return projection(row)
        return update(db, row, actor, {
            status: 'disconnected', disconnected_at: new Date().toISOString(),
            credential_ciphertext: null, credential_nonce: null, credential_tag: null,
            credential_key_version: null, credential_fingerprint: null, key_hint: null,
        })
    })
}

export async function recheckConnectedApp(id: string, version: number): Promise<ConnectionResult<ConnectedApp>> {
    return authorized(async (db, actor) => {
        const row = await load(db, id, version, true)
        if (row.status === 'disconnected') throw new ConnectionError('disconnected', 'Hubungkan kembali dengan API key terlebih dahulu.')
        if (!row.credential_ciphertext || !row.credential_nonce || !row.credential_tag || !row.credential_key_version) {
            throw new ConnectionError('configuration', 'API key tersimpan tidak lengkap. Ganti API key untuk menghubungkan kembali.')
        }
        let profile: ConnectionProfile
        try {
            const apiKey = decryptCredential({
                credential_ciphertext: row.credential_ciphertext,
                credential_nonce: row.credential_nonce,
                credential_tag: row.credential_tag,
                credential_key_version: row.credential_key_version,
            }, row.id)
            profile = await verifyOrderOnlineKey(apiKey)
            assertIdentity(profile, row)
        } catch (error) {
            if (error instanceof ConnectionError && ['invalid_credentials', 'identity_mismatch', 'unavailable', 'invalid_response'].includes(error.code)) {
                const invalid = ['invalid_credentials', 'identity_mismatch'].includes(error.code)
                await update(db, row, actor, {
                    status: invalid ? 'needs_attention' : row.status,
                    last_checked_at: new Date().toISOString(),
                    last_check_outcome: error.code, last_check_error_code: error.code,
                })
            }
            throw error
        }
        const now = new Date().toISOString()
        return update(db, row, actor, {
            profile_snapshot: profile, status: 'connected', last_check_outcome: 'success',
            last_check_error_code: null, last_checked_at: now, last_verified_at: now,
        })
    })
}
