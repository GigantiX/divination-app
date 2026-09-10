'use server'

import { sendPasswordResetEmail } from '@/lib/email/password-reset'
import { hashPassword } from '@/lib/password'
import {
    buildPasswordResetUrl,
    createPasswordResetToken,
    getPasswordResetExpiry,
    hashPasswordResetToken,
} from '@/lib/password-reset'
import { createAdminClient } from '@/lib/supabase/admin'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MINIMUM_PASSWORD_LENGTH = 8
const REQUEST_COOLDOWN_MS = 60 * 1000

const GENERIC_REQUEST_MESSAGE =
    'Jika email tersebut terdaftar, kami telah mengirim tautan untuk mengatur ulang kata sandi.'
const INVALID_TOKEN_MESSAGE =
    'Tautan pengaturan ulang tidak valid, sudah digunakan, atau telah kedaluwarsa.'

export interface PasswordResetActionState {
    status: 'idle' | 'success' | 'error'
    message: string
}

function successRequestState(): PasswordResetActionState {
    return { status: 'success', message: GENERIC_REQUEST_MESSAGE }
}

export async function requestPasswordResetAction(
    _previousState: PasswordResetActionState,
    formData: FormData
): Promise<PasswordResetActionState> {
    const emailValue = formData.get('email')
    const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : ''

    if (!email || !EMAIL_PATTERN.test(email)) {
        return { status: 'error', message: 'Masukkan alamat email yang valid.' }
    }

    const supabase = createAdminClient()
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('username', email)
        .maybeSingle()

    if (profileError) {
        console.error('Password reset profile lookup failed:', profileError)
        return successRequestState()
    }

    // Keep the response identical so the form cannot be used to discover accounts.
    if (!profile) {
        return successRequestState()
    }

    const cooldownStart = new Date(Date.now() - REQUEST_COOLDOWN_MS).toISOString()
    const { data: recentToken, error: cooldownError } = await supabase
        .from('password_reset_tokens')
        .select('id')
        .eq('user_id', profile.id)
        .gte('created_at', cooldownStart)
        .limit(1)
        .maybeSingle()

    if (cooldownError) {
        console.error('Password reset cooldown lookup failed:', cooldownError)
    }

    if (recentToken) {
        return successRequestState()
    }

    const plainToken = createPasswordResetToken()
    const tokenHash = hashPasswordResetToken(plainToken)
    const now = new Date()

    const { error: invalidateError } = await supabase
        .from('password_reset_tokens')
        .update({ used_at: now.toISOString() })
        .eq('user_id', profile.id)
        .is('used_at', null)

    if (invalidateError) {
        console.error('Password reset token invalidation failed:', invalidateError)
    }

    const { error: insertError } = await supabase.from('password_reset_tokens').insert({
        user_id: profile.id,
        token_hash: tokenHash,
        expires_at: getPasswordResetExpiry(now).toISOString(),
    })

    if (insertError) {
        console.error('Password reset token creation failed:', insertError)
        return successRequestState()
    }

    try {
        await sendPasswordResetEmail({
            to: profile.username,
            recipientName: profile.full_name,
            resetUrl: buildPasswordResetUrl(plainToken),
        })
    } catch (error) {
        // Consume an undelivered token so it can never become usable later.
        await supabase
            .from('password_reset_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token_hash', tokenHash)

        console.error('Password reset email delivery failed:', error)
    }

    return successRequestState()
}

export async function resetPasswordAction(
    _previousState: PasswordResetActionState,
    formData: FormData
): Promise<PasswordResetActionState> {
    const tokenValue = formData.get('token')
    const passwordValue = formData.get('password')
    const confirmationValue = formData.get('passwordConfirmation')
    const token = typeof tokenValue === 'string' ? tokenValue.trim() : ''
    const password = typeof passwordValue === 'string' ? passwordValue : ''
    const passwordConfirmation = typeof confirmationValue === 'string' ? confirmationValue : ''

    if (!token || token.length < 32 || token.length > 256) {
        return { status: 'error', message: INVALID_TOKEN_MESSAGE }
    }

    if (password.length < MINIMUM_PASSWORD_LENGTH) {
        return {
            status: 'error',
            message: `Kata sandi baru minimal ${MINIMUM_PASSWORD_LENGTH} karakter.`,
        }
    }

    if (password !== passwordConfirmation) {
        return { status: 'error', message: 'Konfirmasi kata sandi tidak cocok.' }
    }

    const tokenHash = hashPasswordResetToken(token)
    const supabase = createAdminClient()
    const { data: activeToken, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('id')
        .eq('token_hash', tokenHash)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

    if (tokenError) {
        console.error('Password reset token validation failed:', tokenError)
        return { status: 'error', message: 'Gagal memeriksa tautan. Silakan coba lagi.' }
    }

    if (!activeToken) {
        return { status: 'error', message: INVALID_TOKEN_MESSAGE }
    }

    const passwordHash = await hashPassword(password)
    const { data: wasReset, error: resetError } = await supabase.rpc(
        'reset_password_with_token',
        {
            p_token_hash: tokenHash,
            p_password_hash: passwordHash,
        }
    )

    if (resetError) {
        console.error('Password reset transaction failed:', resetError)
        return { status: 'error', message: 'Gagal mengubah kata sandi. Silakan coba lagi.' }
    }

    if (!wasReset) {
        return { status: 'error', message: INVALID_TOKEN_MESSAGE }
    }

    return {
        status: 'success',
        message: 'Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.',
    }
}
