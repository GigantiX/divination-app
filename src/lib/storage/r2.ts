import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const accountId = process.env.R2_ACCOUNT_ID || '0afa06a1d7decb37095fa689067959a7'
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME || 'divination-dashboard-storage'
const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''

// Singleton S3Client — created once per module load, reused across all requests
let _s3Client: S3Client | null = null

function getS3Client(): S3Client {
    if (!accessKeyId || !secretAccessKey) {
        throw new Error(
            'Missing R2 credentials. Please configure R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in .env.local'
        )
    }

    if (!_s3Client) {
        _s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        })
    }

    return _s3Client
}

/**
 * Upload a file buffer or blob to Cloudflare R2
 */
export async function uploadToR2(
    fileBuffer: Buffer | Uint8Array,
    key: string,
    contentType: string
): Promise<{ url?: string; error?: string }> {
    try {
        const s3 = getS3Client()
        await s3.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: fileBuffer,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000', // 1 year cache
            })
        )

        const cleanBase = publicUrlBase.replace(/\/+$/, '')
        const publicUrl = cleanBase ? `${cleanBase}/${key}` : `https://${bucketName}.${accountId}.r2.dev/${key}`

        return { url: publicUrl }
    } catch (err: unknown) {
        // Log full SDK error server-side only; return a generic message to callers
        console.error('Error uploading to Cloudflare R2:', err)
        return { error: 'Gagal mengupload file ke storage. Silakan coba lagi.' }
    }
}

/**
 * Delete an object from Cloudflare R2 bucket by key
 */
export async function deleteFromR2(key: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const s3 = getS3Client()
        await s3.send(
            new DeleteObjectCommand({
                Bucket: bucketName,
                Key: key,
            })
        )
        return { success: true }
    } catch (err: unknown) {
        // Log full SDK error server-side only; return a generic message to callers
        console.error('Error deleting from Cloudflare R2:', err)
        return { error: 'Gagal menghapus file dari storage.' }
    }
}
