import { PASSWORD_RESET_TOKEN_TTL_MINUTES } from '@/lib/password-reset'

interface SendPasswordResetEmailInput {
    to: string
    recipientName: string
    resetUrl: string
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => {
        const entities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
        }

        return entities[character]
    })
}

export async function sendPasswordResetEmail({
    to,
    recipientName,
    resetUrl,
}: SendPasswordResetEmailInput): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    const from = process.env.RESEND_FROM_EMAIL?.trim()

    if (!apiKey || !from) {
        throw new Error('Missing Resend email configuration')
    }

    const safeName = escapeHtml(recipientName.trim() || 'Pengguna')
    const safeResetUrl = escapeHtml(resetUrl)
    const expiryText = `${PASSWORD_RESET_TOKEN_TTL_MINUTES} menit`

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject: 'Atur ulang kata sandi DIVINATION',
            text: [
                `Halo ${recipientName.trim() || 'Pengguna'},`,
                '',
                'Kami menerima permintaan untuk mengatur ulang kata sandi akun DIVINATION Anda.',
                `Buka tautan berikut dalam ${expiryText}:`,
                resetUrl,
                '',
                'Jika Anda tidak meminta perubahan ini, abaikan email ini. Kata sandi Anda tidak akan berubah.',
            ].join('\n'),
            html: `
                <!doctype html>
                <html lang="id">
                    <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033">
                        <div style="margin:0 auto;max-width:560px;padding:40px 20px">
                            <div style="border:1px solid #dfe6ef;border-radius:16px;background:#ffffff;padding:32px">
                                <p style="margin:0 0 24px;color:#2563eb;font-size:13px;font-weight:700;letter-spacing:0.14em">DIVINATION</p>
                                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">Atur ulang kata sandi</h1>
                                <p style="margin:0 0 12px;line-height:1.65">Halo ${safeName},</p>
                                <p style="margin:0 0 24px;color:#536079;line-height:1.65">Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Tautan ini berlaku selama ${expiryText}.</p>
                                <a href="${safeResetUrl}" style="display:inline-block;border-radius:10px;background:#2563eb;padding:13px 20px;color:#ffffff;font-weight:700;text-decoration:none">Buat kata sandi baru</a>
                                <p style="margin:28px 0 0;color:#7a8498;font-size:13px;line-height:1.6">Jika Anda tidak meminta perubahan ini, abaikan email ini. Kata sandi Anda tidak akan berubah.</p>
                            </div>
                        </div>
                    </body>
                </html>
            `,
        }),
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error(`Resend request failed with status ${response.status}`)
    }
}
