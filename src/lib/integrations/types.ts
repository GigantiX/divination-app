export const CONNECTED_APP_PROVIDERS = [
    { id: 'orderonline', name: 'OrderOnline', enabled: true, initials: 'OO' },
    { id: 'berdu', name: 'Berdu', enabled: false, initials: 'B' },
    { id: 'scalev', name: 'Scalev', enabled: false, initials: 'S' },
    { id: 'sejoli', name: 'Sejoli', enabled: false, initials: 'SJ' },
] as const

export interface ConnectionProfile {
    schema_version: 1
    user_id: string
    owner_id: string
    name: string | null
    email: string | null
    username: string | null
    phone: string | null
    role: string | null
    capabilities: string[]
    is_active: boolean | null
    package: string | null
    expired_date: string | null
}

export type ConnectionStatus = 'connected' | 'needs_attention' | 'disconnected'

export interface ConnectedApp {
    id: string
    provider: 'orderonline'
    name: string
    profile: ConnectionProfile
    key_hint: string | null
    status: ConnectionStatus
    last_check_outcome: string | null
    last_checked_at: string | null
    last_verified_at: string | null
    created_at: string
    version: number
}

export type ConnectionErrorCode =
    | 'unauthenticated' | 'forbidden' | 'validation' | 'configuration'
    | 'invalid_credentials' | 'unavailable' | 'invalid_response'
    | 'identity_mismatch' | 'duplicate' | 'conflict' | 'not_found'
    | 'disconnected' | 'verification_expired' | 'database'

export type ConnectionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; code: ConnectionErrorCode }

export interface CheckConnectionInput {
    provider: string
    name: string
    apiKey: string
    connectionId?: string
    version?: number
}

export interface SaveConnectionInput extends CheckConnectionInput {
    receipt: string
}

export interface CheckedConnection {
    profile: ConnectionProfile
    receipt: string
    expiresAt: number
    sameAccountExists: boolean
}
