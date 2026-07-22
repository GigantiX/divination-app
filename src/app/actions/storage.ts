'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadFile, deleteFile } from '@/lib/storage'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const FILE_EXTENSION_BY_TYPE: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}

async function requireAdminOrDeveloper() {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' as const }
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
        return { error: 'Tidak memiliki akses' as const }
    }

    return { supabase, userId: session.user.id }
}

/**
 * Upload an event logo to Cloudflare R2 Storage (with legacy Supabase read compatibility)
 * @param formData - FormData with 'file' field containing the image blob
 * @param eventId - Event ID to associate the logo with (used for filename)
 * @returns URL of the uploaded image or error
 */
export async function uploadEventLogo(
    formData: FormData,
    eventId: string,
    oldLogoUrl?: string | null
): Promise<{ url?: string; error?: string }> {
    const access = await requireAdminOrDeveloper()
    if ('error' in access) {
        return { error: access.error }
    }

    const { userId } = access

    const file = formData.get('file') as Blob | null

    if (!file) {
        return { error: 'File tidak ditemukan' }
    }

    if (!/^[a-zA-Z0-9-]+$/.test(eventId)) {
        return { error: 'ID event tidak valid' }
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return { error: 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' }
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return { error: 'Ukuran file terlalu besar. Maksimal 5MB.' }
    }

    const extension = FILE_EXTENSION_BY_TYPE[file.type]
    if (!extension) {
        return { error: 'Format file tidak didukung' }
    }

    // Generate unique filename key
    const timestamp = Date.now()
    const filename = `event-logos/${userId}/${eventId}-${timestamp}.${extension}`

    // Delete old logo from storage before uploading new one (handles both old Supabase and new R2)
    if (oldLogoUrl) {
        await deleteFile(oldLogoUrl).catch(() => { })
    }

    // Upload to R2 Storage
    const { url, error: uploadError } = await uploadFile(file, filename)

    if (uploadError || !url) {
        console.error('Error uploading logo:', uploadError)
        return { error: uploadError || 'Gagal mengupload logo. Silakan coba lagi.' }
    }

    return { url }
}

/**
 * Update event logo URL in database
 */
export async function updateEventLogo(
    eventId: string,
    logoUrl: string
): Promise<{ success?: boolean; error?: string }> {
    const access = await requireAdminOrDeveloper()
    if ('error' in access) {
        return { error: access.error }
    }

    const { supabase } = access

    const { error } = await supabase
        .from('events')
        .update({ logo_url: logoUrl })
        .eq('id', eventId)

    if (error) {
        console.error('Error updating event logo:', error)
        return { error: 'Gagal menyimpan logo' }
    }

    return { success: true }
}

/**
 * Delete old logo from storage (for cleanup)
 */
export async function deleteEventLogo(
    logoUrl: string
): Promise<{ success?: boolean; error?: string }> {
    const access = await requireAdminOrDeveloper()
    if ('error' in access) {
        return { error: access.error }
    }

    const res = await deleteFile(logoUrl)
    if (res.error) {
        return { error: res.error }
    }

    return { success: true }
}

