'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashPassword, verifyPassword } from '@/lib/password'

// ─── Types ──────────────────────────────────────────────

export interface ChangePasswordInput {
    currentPassword: string
    newPassword: string
}

export interface ActionResult {
    success?: boolean
    error?: string
}

export interface HelpContact {
    id: string
    name: string
    username: string
    emoji: string
    role: 'admin' | 'developer'
}

export interface HelpContactsResult {
    admins?: HelpContact[]
    developers?: HelpContact[]
    error?: string
}

// ─── Actions ────────────────────────────────────────────

/**
 * Change the current user's password.
 * Verifies old password before updating.
 */
export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    // Validate new password length
    if (!input.newPassword || input.newPassword.length < 8) {
        return { error: 'Kata sandi baru minimal 8 karakter' }
    }

    if (!input.currentPassword) {
        return { error: 'Kata sandi saat ini harus diisi' }
    }

    if (input.currentPassword === input.newPassword) {
        return { error: 'Kata sandi baru tidak boleh sama dengan kata sandi lama' }
    }

    const supabase = createAdminClient()

    // Fetch current password hash
    const { data: profile } = await supabase
        .from('profiles')
        .select('password_hash')
        .eq('id', session.user.id)
        .single()

    if (!profile?.password_hash) {
        return { error: 'Profil tidak ditemukan' }
    }

    // Verify current password
    const isValid = await verifyPassword(input.currentPassword, profile.password_hash)
    if (!isValid) {
        return { error: 'Kata sandi saat ini salah' }
    }

    // Hash and save new password
    const newHash = await hashPassword(input.newPassword)

    const { error } = await supabase
        .from('profiles')
        .update({ password_hash: newHash })
        .eq('id', session.user.id)

    if (error) {
        console.error('Error changing password:', error)
        return { error: 'Gagal mengubah kata sandi. Silakan coba lagi.' }
    }

    return { success: true }
}

/**
 * Fetch Admin and Developer contacts for the Help Center.
 * Available to all authenticated users.
 */
export async function getHelpContacts(): Promise<HelpContactsResult> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    const { data: contacts, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, emoji, role')
        .in('role', ['admin', 'developer'])
        .order('role', { ascending: true })
        .order('full_name', { ascending: true })

    if (error) {
        console.error('Error fetching help contacts:', error)
        return { error: 'Gagal memuat data kontak' }
    }

    const admins: HelpContact[] = []
    const developers: HelpContact[] = []

    for (const c of contacts || []) {
        const contact: HelpContact = {
            id: c.id,
            name: c.full_name,
            username: c.username,
            emoji: c.emoji || '👤',
            role: c.role as 'admin' | 'developer',
        }
        if (c.role === 'admin') {
            admins.push(contact)
        } else {
            developers.push(contact)
        }
    }

    return { admins, developers }
}
