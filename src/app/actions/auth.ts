'use server'

import { signIn, signOut } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashPassword } from '@/lib/password'
import { getRandomEmoji } from '@/lib/emojis'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'

export type LoginActionState = {
    error: string
}

/**
 * Login action - Authenticate user with email and password
 */
export async function loginAction(
    _previousState: LoginActionState,
    formData: FormData
): Promise<LoginActionState> {
    const emailValue = formData.get('email')
    const passwordValue = formData.get('password')
    const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : ''
    const password = typeof passwordValue === 'string' ? passwordValue : ''

    if (!email || !password) {
        return { error: 'Email dan password wajib diisi' }
    }

    try {
        await signIn('credentials', {
            email,
            password,
            redirect: false,
        })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return { error: 'Email atau password salah' }
                default:
                    return { error: 'Terjadi kesalahan saat login' }
            }
        }
        throw error
    }

    redirect('/dashboard')
}

/**
 * Register action - Create new user account
 * Uses admin client to bypass RLS for profile creation
 */
export async function registerAction(formData: FormData) {
    const emailValue = formData.get('email')
    const passwordValue = formData.get('password')
    const displayNameValue = formData.get('displayName')
    const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : ''
    const password = typeof passwordValue === 'string' ? passwordValue : ''
    const displayName = typeof displayNameValue === 'string' ? displayNameValue.trim() : ''

    // Validate required fields
    if (!email || !password || !displayName) {
        return { error: 'Semua kolom wajib diisi' }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { error: 'Format email tidak valid' }
    }

    // Validate password length
    if (password.length < 8) {
        return { error: 'Password minimal 8 karakter' }
    }

    // Validate display name
    if (displayName.length < 2) {
        return { error: 'Nama minimal 2 karakter' }
    }
    if (displayName.length > 100) {
        return { error: 'Nama maksimal 100 karakter' }
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Check if user exists
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', email)
        .single()

    if (existing) {
        return { error: 'Email sudah terdaftar' }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create profile (admin client bypasses RLS)
    const { error } = await supabase.from('profiles').insert({
        id: crypto.randomUUID(), // Generate UUID since we're not using auth.users
        username: email,
        full_name: displayName,
        role: 'user',
        password_hash: passwordHash,
        emoji: getRandomEmoji(), // Random emoji for avatar
    })

    if (error) {
        console.error('Registration error:', error)
        return { error: 'Gagal membuat akun. Silakan coba lagi.' }
    }

    // Auto-login after registration
    try {
        await signIn('credentials', {
            email,
            password,
            redirectTo: '/dashboard',
        })
    } catch (error) {
        // Auth.js throws NEXT_REDIRECT which is expected behavior
        // We need to re-throw it so Next.js can handle the redirect
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            throw error
        }
        // Registration successful but login failed - redirect to login page
        redirect('/login')
    }
}

/**
 * Logout action - Sign out user and redirect to login
 */
export async function logoutAction() {
    await signOut({ redirect: false })
    redirect('/login')
}
