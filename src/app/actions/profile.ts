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
