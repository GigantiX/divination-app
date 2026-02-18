/**
 * Image utility functions for compression and validation
 * Used for event logos and other image uploads
 */

// Image upload constraints
export const IMAGE_CONFIG = {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    maxSizeMB: 5,
    maxWidth: 512, // Recommended logo dimension
    maxHeight: 512,
    quality: 0.8, // JPEG quality (0.0 - 1.0)
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
}

/**
 * Validates an image file
 * @returns Error message string or null if valid
 */
export function validateImage(file: File): string | null {
    if (!IMAGE_CONFIG.acceptedTypes.includes(file.type)) {
        return 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.'
    }

    if (file.size > IMAGE_CONFIG.maxSizeBytes) {
        return `Ukuran file terlalu besar. Maksimal ${IMAGE_CONFIG.maxSizeMB}MB.`
    }

    return null
}

/**
 * Compresses an image file to reduce size
 * @param file - Original image file
 * @param maxWidth - Maximum width (default: 512)
 * @param maxHeight - Maximum height (default: 512)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed image as Blob
 */
export async function compressImage(
    file: File,
    maxWidth = IMAGE_CONFIG.maxWidth,
    maxHeight = IMAGE_CONFIG.maxHeight,
    quality = IMAGE_CONFIG.quality
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (event) => {
            const img = new Image()

            img.onload = () => {
                // Calculate new dimensions while maintaining aspect ratio
                let width = img.width
                let height = img.height

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width)
                    width = maxWidth
                }

                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height)
                    height = maxHeight
                }

                // Create canvas and draw resized image
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Could not get canvas context'))
                    return
                }

                // Use high-quality image smoothing
                ctx.imageSmoothingEnabled = true
                ctx.imageSmoothingQuality = 'high'
                ctx.drawImage(img, 0, 0, width, height)

                // Convert to WebP for best compression, fallback to JPEG
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Failed to compress image'))
                        }
                    },
                    'image/webp',
                    quality
                )
            }

            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = event.target?.result as string
        }

        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

/**
 * Formats file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
