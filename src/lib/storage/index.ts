import { uploadToR2, deleteFromR2 } from './r2'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Upload a file to Cloudflare R2 storage
 */
export async function uploadFile(
    file: Blob,
    pathKey: string
): Promise<{ url?: string; error?: string }> {
    // arrayBuffer() is always available on Blob in Next.js server actions (Node.js ≥18)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return await uploadToR2(buffer, pathKey, file.type)
}

/**
 * Delete a file by inspecting its URL (handles legacy Supabase files and new R2 files)
 */
export async function deleteFile(
    fileUrl: string
): Promise<{ success?: boolean; error?: string }> {
    if (!fileUrl) return { success: true }

    // Check if file is stored in legacy Supabase Storage
    if (fileUrl.includes('/storage/v1/object/') || fileUrl.includes('.supabase.co')) {
        try {
            const supabase = createAdminClient()
            const urlParts = fileUrl.split('/uploads/')
            if (urlParts.length >= 2) {
                const oldFilename = decodeURIComponent(urlParts[1].split('?')[0])
                const { error } = await supabase.storage.from('uploads').remove([oldFilename])
                if (error) {
                    console.warn('Could not delete legacy Supabase file:', error.message)
                }
            }
            return { success: true }
        } catch (err) {
            console.warn('Error deleting legacy Supabase file:', err)
            return { success: true } // Don't block workflow on legacy delete error
        }
    }

    // Otherwise, handle R2 file deletion
    try {
        const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''
        let key = ''

        if (publicUrlBase && fileUrl.startsWith(publicUrlBase)) {
            key = fileUrl.replace(`${publicUrlBase}/`, '')
        } else {
            const urlObj = new URL(fileUrl)

            // Validate: only allow deletion from known R2 hostnames
            const isKnownR2Host =
                urlObj.hostname.endsWith('.r2.dev') ||
                urlObj.hostname.endsWith('.r2.cloudflarestorage.com')
            if (!isKnownR2Host) {
                console.warn('deleteFile: refusing to delete from unknown host:', urlObj.hostname)
                return { success: true }
            }

            key = urlObj.pathname.replace(/^\/+/, '')
        }

        if (key) {
            return await deleteFromR2(key)
        }
    } catch (err) {
        console.error('Error parsing R2 URL for deletion:', err)
    }

    return { success: true }
}
