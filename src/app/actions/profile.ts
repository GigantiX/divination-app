'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface UserProfile {
    id: string
    username: string
    full_name: string
    emoji: string
    role: string
}

export interface FacebookConnectionStatus {
    connected: boolean
    connectedAt: string | null
    facebookEmail: string | null
}

/**
 * Get current user's profile from database
 */
export async function getProfile(): Promise<UserProfile | null> {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, emoji, role')
        .eq('id', session.user.id)
        .single()

    if (error || !profile) {
        console.error('Error fetching profile:', error)
        return null
    }

    return profile as UserProfile
}

/**
 * Get current user's Facebook connection status
 */
export async function getFacebookConnectionStatus(): Promise<FacebookConnectionStatus | null> {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('oauth_identities')
        .select('connected_at, provider_email')
        .eq('user_id', session.user.id)
        .eq('provider', 'facebook')
        .maybeSingle()

    if (error) {
        console.error('Error fetching Facebook connection status:', error)
        return { connected: false, connectedAt: null, facebookEmail: null }
    }

    if (!data) {
        return { connected: false, connectedAt: null, facebookEmail: null }
    }

    return {
        connected: true,
        connectedAt: data.connected_at || null,
        facebookEmail: data.provider_email || null,
    }
}

/**
 * Disconnect Facebook account from current user
 */
export async function disconnectFacebookAction() {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()
    const { error } = await supabase
        .from('oauth_identities')
        .delete()
        .eq('user_id', session.user.id)
        .eq('provider', 'facebook')

    if (error) {
        console.error('Error disconnecting Facebook:', error)
        return { error: 'Gagal memutuskan koneksi Facebook' }
    }

    revalidatePath('/settings')
    return { success: true }
}

/**
 * Update user's display name
 */
export async function updateDisplayName(displayName: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    if (!displayName || displayName.length < 2) {
        return { error: 'Nama minimal 2 karakter' }
    }

    if (displayName.length > 100) {
        return { error: 'Nama maksimal 100 karakter' }
    }

    const supabase = createAdminClient()
    const { error } = await supabase
        .from('profiles')
        .update({ full_name: displayName })
        .eq('id', session.user.id)

    if (error) {
        console.error('Error updating display name:', error)
        return { error: 'Gagal memperbarui nama' }
    }

    revalidatePath('/settings')
    return { success: true }
}

/**
 * Update user's emoji avatar
 */
export async function updateEmoji(emoji: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    if (!emoji) {
        return { error: 'Emoji wajib dipilih' }
    }

    const supabase = createAdminClient()
    const { error } = await supabase
        .from('profiles')
        .update({ emoji })
        .eq('id', session.user.id)

    if (error) {
        console.error('Error updating emoji:', error)
        return { error: 'Gagal memperbarui emoji' }
    }

    revalidatePath('/settings')
    return { success: true }
}
