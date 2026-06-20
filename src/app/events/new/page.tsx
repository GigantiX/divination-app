"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Upload, Loader2, Check, X, ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { createEvent } from "@/app/actions/events"
import { uploadEventLogo, updateEventLogo } from "@/app/actions/storage"
import { validateImage, compressImage, formatFileSize, IMAGE_CONFIG } from "@/lib/image"

export default function NewEventPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState(false)

    // Form state
    const [name, setName] = React.useState("")

    // Image state
    const [preview, setPreview] = React.useState<string | null>(null)
    const [imageFile, setImageFile] = React.useState<File | null>(null)
    const [isCompressing, setIsCompressing] = React.useState(false)
    const [compressedBlob, setCompressedBlob] = React.useState<Blob | null>(null)
    const [originalSize, setOriginalSize] = React.useState<number>(0)
    const [compressedSize, setCompressedSize] = React.useState<number>(0)

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file
        const validationError = validateImage(file)
        if (validationError) {
            setError(validationError)
            return
        }

        setError(null)
        setImageFile(file)
        setOriginalSize(file.size)
        setIsCompressing(true)

        try {
            // Compress the image
            const compressed = await compressImage(file)
            setCompressedBlob(compressed)
            setCompressedSize(compressed.size)

            // Create preview
            const previewUrl = URL.createObjectURL(compressed)
            setPreview(previewUrl)
        } catch (err) {
            console.error('Error compressing image:', err)
            setError('Gagal memproses gambar. Silakan coba lagi.')
        } finally {
            setIsCompressing(false)
        }
    }

    const clearImage = () => {
        setPreview(null)
        setImageFile(null)
        setCompressedBlob(null)
        setOriginalSize(0)
        setCompressedSize(0)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        // Step 1: Create event (without logo first)
        const result = await createEvent({
            name,
            logo_url: null,
        })

        if (result.error) {
            setError(result.error)
            setIsLoading(false)
            return
        }

        const eventId = result.eventId!

        // Step 2: Upload logo if exists
        if (compressedBlob) {
            const formData = new FormData()
            formData.append('file', compressedBlob, 'logo.webp')

            const uploadResult = await uploadEventLogo(formData, eventId)

            if (uploadResult.error) {
                // Event created but logo failed - still show success but with warning
                console.error('Logo upload failed:', uploadResult.error)
            } else if (uploadResult.url) {
                // Update event with logo URL
                await updateEventLogo(eventId, uploadResult.url)
            }
        }

        setSuccess(true)
        setIsLoading(false)

        // Redirect to dashboard after brief success message
        setTimeout(() => {
            router.push("/dashboard")
        }, 1000)
    }

    const isValid = name.trim().length >= 2

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center border-b bg-white px-4 py-4">
                <Link href="/dashboard" className="mr-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="flex-1 text-center text-lg font-bold text-black pr-12">
                    Buat Event Baru
                </h1>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <Label>Logo Event (Opsional)</Label>
                                <div className={`relative flex h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${preview ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50"
                                    }`}>
                                    {!preview && (
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                            onChange={handleImageChange}
                                            disabled={isCompressing || isLoading}
                                        />
                                    )}

                                    {isCompressing ? (
                                        <div className="flex flex-col items-center gap-2 text-primary">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                            <span className="text-sm">Mengompres gambar...</span>
                                        </div>
                                    ) : preview ? (
                                        <div className="relative h-full w-full p-3">
                                            <img
                                                src={preview}
                                                alt="Preview"
                                                className="h-full w-full rounded-lg object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={clearImage}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <div className="rounded-full bg-gray-100 p-4">
                                                <ImageIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-sm font-medium text-gray-700">Tap untuk upload logo</span>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    JPG, PNG, WebP, GIF (maks. {IMAGE_CONFIG.maxSizeMB}MB)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Compression info */}
                                {compressedBlob && originalSize > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Check className="h-3 w-3 text-green-500" />
                                        <span>
                                            Dikompres: {formatFileSize(originalSize)} → {formatFileSize(compressedSize)}
                                            {" "}({Math.round((1 - compressedSize / originalSize) * 100)}% lebih kecil)
                                        </span>
                                    </div>
                                )}

                                <p className="text-xs text-gray-500">
                                    Ukuran rekomendasi: {IMAGE_CONFIG.maxWidth}×{IMAGE_CONFIG.maxHeight}px
                                </p>
                            </div>

                            {/* Event Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Nama Event *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Meta Ads Q1 2024"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-11"
                                    maxLength={100}
                                />
                                <p className="text-xs text-gray-500">
                                    Minimal 2 karakter, maksimal 100 karakter
                                </p>
                            </div>

                            {/* Info Note */}
                            <div className="rounded-lg bg-blue-50 p-4">
                                <p className="text-xs text-blue-600">
                                    <strong>Catatan:</strong> Anda dapat menambahkan batch ke event ini setelah membuatnya.
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="rounded-lg bg-red-50 p-4">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="rounded-lg bg-green-50 p-4 flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-600" />
                                    <p className="text-sm text-green-600">Event berhasil dibuat!</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="h-11 w-full text-base"
                                disabled={isLoading || !isValid || success || isCompressing}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {compressedBlob ? "Mengupload..." : "Membuat..."}
                                    </>
                                ) : success ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Berhasil!
                                    </>
                                ) : (
                                    "Buat Event"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
