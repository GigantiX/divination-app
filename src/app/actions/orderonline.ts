'use server'

import { auth } from '@/auth'
import { getUserRole } from '@/lib/authorization'
import { createAdminClient } from '@/lib/supabase/admin'

type ConnectionStatus = 'not_connected' | 'login_required' | 'connected' | 'unreachable'
type RunnerStatus = 'authenticated' | 'needs_manual_login' | 'unreachable'

export interface OrderOnlineConnectionResult {
    error?: string
    expiresAt?: string
    status: ConnectionStatus
    viewerUrl?: string
}

export interface OrderOnlineCsvDownload {
    bytes: number
    downloadedAt: string
    filename: string
    id: string
}

interface AuthorizedConnectionRequest {
    connectionId: string | null
}

interface StoredConnection {
    id: string
    status: ConnectionStatus
}

const DOWNLOAD_ID_PATTERN = /^[0-9a-f]{32}$/i

function runnerConfiguration() {
    const baseUrl = process.env.ORDERONLINE_RUNNER_URL?.replace(/\/+$/, '')
    const token = process.env.ORDERONLINE_RUNNER_API_TOKEN?.trim()
    if (!baseUrl || !token) return null

    try {
        const url = new URL(baseUrl)
        return url.protocol === 'https:' ? { baseUrl, token } : null
    } catch {
        return null
    }
}

async function callRunner(path: string, method: 'DELETE' | 'GET' | 'POST') {
    const config = runnerConfiguration()
    if (!config) return { error: 'config_error' as const }

    try {
        const response = await fetch(`${config.baseUrl}${path}`, {
            method,
            cache: 'no-store',
            headers: { Authorization: `Bearer ${config.token}` },
        })
        const body = await response.json().catch(() => null)

        if (!response.ok || !body || typeof body !== 'object') {
            return { error: response.status === 409 ? 'login_in_progress' as const : 'runner_error' as const }
        }

        return { body: body as { downloads?: unknown[]; expiresAt?: string; status?: RunnerStatus; viewerUrl?: string } }
    } catch {
        return { error: 'runner_error' as const }
    }
}

async function getOwnedConnectionId(): Promise<string | null | { error: string }> {
    const authorization = await authorizeConnectionRequest(false)
    if ('error' in authorization) return { error: authorization.error }
    return authorization.connectionId
}

function connectionStatusFromRunner(status: RunnerStatus | undefined): ConnectionStatus {
    if (status === 'authenticated') return 'connected'
    if (status === 'unreachable') return 'unreachable'
    return 'login_required'
}

function isOrderOnlineCsvDownload(value: unknown): value is OrderOnlineCsvDownload {
    if (!value || typeof value !== 'object') return false
    const download = value as Record<string, unknown>
    return (
        typeof download.id === 'string' &&
        DOWNLOAD_ID_PATTERN.test(download.id) &&
        typeof download.filename === 'string' &&
        typeof download.bytes === 'number' &&
        typeof download.downloadedAt === 'string'
    )
}

async function authorizeConnectionRequest(
    createIfMissing: boolean,
): Promise<AuthorizedConnectionRequest | { error: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    const supabase = createAdminClient()
    const profileRole = await getUserRole(supabase, session.user.id)

    if (!profileRole) return { error: 'Profil tidak ditemukan' }

    const { data: existing } = await supabase
        .from('orderonline_connections')
        .select('id, status')
        .eq('user_id', session.user.id)
        .maybeSingle()

    if (existing) return { connectionId: existing.id }
    if (!createIfMissing) return { connectionId: null }

    const { data: created, error } = await supabase
        .from('orderonline_connections')
        .insert({ user_id: session.user.id, status: 'not_connected' })
        .select('id, status')
        .single()

    if (created) return { connectionId: created.id }

    if (error) {
        const { data: concurrent } = await supabase
            .from('orderonline_connections')
            .select('id, status')
            .eq('user_id', session.user.id)
            .maybeSingle()
        if (concurrent) return { connectionId: concurrent.id }
    }

    return { error: 'Gagal menyiapkan koneksi OrderOnline' }
}

async function updateConnectionStatus(connectionId: string, status: ConnectionStatus, authenticated = false) {
    const now = new Date().toISOString()
    await createAdminClient()
        .from('orderonline_connections')
        .update({
            status,
            last_checked_at: now,
            ...(authenticated ? { last_authenticated_at: now } : {}),
        })
        .eq('id', connectionId)
}

function resultForRunnerStatus(status: RunnerStatus | undefined, expiresAt?: string): OrderOnlineConnectionResult {
    const mappedStatus = connectionStatusFromRunner(status)
    return {
        expiresAt,
        status: mappedStatus,
        ...(mappedStatus === 'unreachable' ? { error: 'OrderOnline belum dapat dijangkau dari VPS. Coba lagi sebentar.' } : {}),
    }
}

export async function getOrderOnlineConnectionStatus(_legacyScopeId?: string): Promise<OrderOnlineConnectionResult> {
    const authorization = await authorizeConnectionRequest(false)
    if ('error' in authorization) return { error: authorization.error, status: 'not_connected' }
    if (!authorization.connectionId) return { status: 'not_connected' }

    const { data } = await createAdminClient()
        .from('orderonline_connections')
        .select('id, status')
        .eq('id', authorization.connectionId)
        .maybeSingle()

    return { status: (data as StoredConnection | null)?.status ?? 'not_connected' }
}

export async function startOrderOnlineLogin(_legacyScopeId?: string): Promise<OrderOnlineConnectionResult> {
    const authorization = await authorizeConnectionRequest(true)
    if ('error' in authorization) return { error: authorization.error, status: 'not_connected' }
    if (!authorization.connectionId) return { error: 'Gagal menyiapkan koneksi OrderOnline', status: 'not_connected' }

    const result = await callRunner(`/api/v1/connections/${authorization.connectionId}/start`, 'POST')
    if ('error' in result) {
        if (result.error === 'config_error') return { error: 'Koneksi OrderOnline belum dikonfigurasi oleh administrator.', status: 'not_connected' }
        if (result.error === 'login_in_progress') return { error: 'Ada sesi login OrderOnline lain yang sedang berlangsung. Coba lagi sebentar.', status: 'login_required' }
        return { error: 'Tidak dapat membuka browser OrderOnline di VPS.', status: 'unreachable' }
    }

    const response = resultForRunnerStatus(result.body.status, result.body.expiresAt)
    await updateConnectionStatus(authorization.connectionId, response.status, response.status === 'connected')
    return result.body.viewerUrl ? { ...response, viewerUrl: result.body.viewerUrl } : response
}

export async function completeOrderOnlineLogin(_legacyScopeId?: string): Promise<OrderOnlineConnectionResult> {
    const authorization = await authorizeConnectionRequest(false)
    if ('error' in authorization) return { error: authorization.error, status: 'not_connected' }
    if (!authorization.connectionId) return { status: 'not_connected' }

    const result = await callRunner(`/api/v1/connections/${authorization.connectionId}/complete`, 'POST')
    if ('error' in result) return { error: 'Tidak dapat memeriksa sesi OrderOnline.', status: 'unreachable' }

    const response = resultForRunnerStatus(result.body.status, result.body.expiresAt)
    await updateConnectionStatus(authorization.connectionId, response.status, response.status === 'connected')
    return response
}

export async function cancelOrderOnlineLogin(_legacyScopeId?: string): Promise<OrderOnlineConnectionResult> {
    const authorization = await authorizeConnectionRequest(false)
    if ('error' in authorization) return { error: authorization.error, status: 'not_connected' }
    if (!authorization.connectionId) return { status: 'not_connected' }

    const result = await callRunner(`/api/v1/connections/${authorization.connectionId}/cancel`, 'POST')
    if ('error' in result) return { error: 'Tidak dapat menutup sesi browser OrderOnline.', status: 'unreachable' }

    await updateConnectionStatus(authorization.connectionId, 'login_required')
    return { status: 'login_required' }
}

export async function getOrderOnlineCsvDownloads(): Promise<{ data?: OrderOnlineCsvDownload[]; error?: string }> {
    const connectionId = await getOwnedConnectionId()
    if (typeof connectionId !== 'string') return { error: connectionId?.error ?? 'OrderOnline belum terhubung' }

    const result = await callRunner(`/api/v1/connections/${connectionId}/downloads`, 'GET')
    if ('error' in result || !Array.isArray(result.body.downloads)) {
        return { error: 'Belum ada CSV yang dapat dibaca dari browser OrderOnline.' }
    }

    const data = result.body.downloads.filter(isOrderOnlineCsvDownload)

    return { data }
}
