'use server'

import { signIn, signOut } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/password'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'

/**
 * Login action - Authenticate user with email and password
 */
export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

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
 */
export async function registerAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const displayName = formData.get('displayName') as string

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

    const supabase = await createClient()

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

    // Create profile
    const { error } = await supabase.from('profiles').insert({
        username: email,
        full_name: displayName,
        role: 'user',
        password_hash: passwordHash,
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
            redirect: false,
        })
    } catch (error) {
        // Registration successful but login failed
        return {
            success: true,
            message: 'Akun berhasil dibuat! Silakan login.',
        }
    }

    redirect('/dashboard')
}

/**
 * Logout action - Sign out user and redirect to login
 */
export async function logoutAction() {
    await signOut({ redirect: false })
    redirect('/login')
}
