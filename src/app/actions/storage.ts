'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Upload an event logo to Supabase Storage
 * @param formData - FormData with 'file' field containing the image blob
 * @param eventId - Event ID to associate the logo with (used for filename)
 * @returns URL of the uploaded image or error
 */
export async function uploadEventLogo(
    formData: FormData,
    eventId: string
): Promise<{ url?: string; error?: string }> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Verify user is admin/developer
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
        return { error: 'Tidak memiliki akses' }
    }

    const file = formData.get('file') as Blob | null

    if (!file) {
        return { error: 'File tidak ditemukan' }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `event-logos/${eventId}-${timestamp}.webp`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filename, file, {
            contentType: 'image/webp',
            cacheControl: '31536000', // 1 year cache
            upsert: true,
        })

    if (uploadError) {
        console.error('Error uploading logo:', uploadError)
        return { error: 'Gagal mengupload logo. Silakan coba lagi.' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filename)

    return { url: urlData.publicUrl }
}

/**
 * Update event logo URL in database
 */
export async function updateEventLogo(
    eventId: string,
    logoUrl: string
): Promise<{ success?: boolean; error?: string }> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Verify user is admin/developer
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
        return { error: 'Tidak memiliki akses' }
    }

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
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Extract filename from URL
    const urlParts = logoUrl.split('/uploads/')
    if (urlParts.length < 2) {
        return { error: 'URL logo tidak valid' }
    }

    const filename = urlParts[1]

    const { error } = await supabase.storage
        .from('uploads')
        .remove([filename])

    if (error) {
        console.error('Error deleting logo:', error)
        return { error: 'Gagal menghapus logo' }
    }

    return { success: true }
}
