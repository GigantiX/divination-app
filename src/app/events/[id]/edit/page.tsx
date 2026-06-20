"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, Upload, Loader2, Check, X, ImageIcon, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { getEvent, updateEvent } from "@/app/actions/events"
import { uploadEventLogo, updateEventLogo } from "@/app/actions/storage"
import { validateImage, compressImage, formatFileSize, IMAGE_CONFIG } from "@/lib/image"

export default function EditEventPage() {
    const router = useRouter()
    const params = useParams()
    const eventId = params.id as string

    const [isPageLoading, setIsPageLoading] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState(false)

    // Current event data
    const [name, setName] = React.useState("")
    const [currentLogoUrl, setCurrentLogoUrl] = React.useState<string | null>(null)

    // New image state
    const [preview, setPreview] = React.useState<string | null>(null)
    const [isCompressing, setIsCompressing] = React.useState(false)
    const [compressedBlob, setCompressedBlob] = React.useState<Blob | null>(null)
    const [originalSize, setOriginalSize] = React.useState(0)
    const [compressedSize, setCompressedSize] = React.useState(0)
    const [logoChanged, setLogoChanged] = React.useState(false)

    // Load current event data
    React.useEffect(() => {
        const load = async () => {
            const event = await getEvent(eventId)
            if (!event) {
                setError("Event tidak ditemukan atau tidak memiliki akses.")
                setIsPageLoading(false)
                return
            }
            setName(event.name)
            setCurrentLogoUrl(event.logo_url)
            // Show existing logo as preview
            if (event.logo_url) setPreview(event.logo_url)
            setIsPageLoading(false)
        }
        load()
    }, [eventId])

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const validationError = validateImage(file)
        if (validationError) {
            setError(validationError)
            return
        }

        setError(null)
        setOriginalSize(file.size)
        setIsCompressing(true)

        try {
            const compressed = await compressImage(file)
            setCompressedBlob(compressed)
            setCompressedSize(compressed.size)
            const previewUrl = URL.createObjectURL(compressed)
            setPreview(previewUrl)
            setLogoChanged(true)
        } catch (err) {
            console.error("Error compressing image:", err)
            setError("Gagal memproses gambar. Silakan coba lagi.")
        } finally {
            setIsCompressing(false)
        }
    }

    const clearImage = () => {
        setPreview(null)
        setCompressedBlob(null)
        setOriginalSize(0)
        setCompressedSize(0)
        setLogoChanged(true) // mark as changed so we know to remove logo
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setError(null)

        // Step 1: Update event name
        const result = await updateEvent(eventId, { name })
        if (result.error) {
            setError(result.error)
            setIsSaving(false)
            return
        }

        // Step 2: Handle logo changes
        if (logoChanged) {
            if (compressedBlob) {
                // Upload new logo (auto-deletes old one via oldLogoUrl param)
                const formData = new FormData()
                formData.append("file", compressedBlob, "logo.webp")
                const uploadResult = await uploadEventLogo(formData, eventId, currentLogoUrl)

                if (uploadResult.error) {
                    setError(`Nama berhasil disimpan, tapi logo gagal diupload: ${uploadResult.error}`)
                    setIsSaving(false)
                    return
                } else if (uploadResult.url) {
                    await updateEventLogo(eventId, uploadResult.url)
                }
            } else if (currentLogoUrl) {
                // Logo was cleared — remove it from the event record
                await updateEvent(eventId, { logo_url: null })
            }
        }

        setSuccess(true)
        setIsSaving(false)

        setTimeout(() => {
            router.push(`/events/${eventId}`)
        }, 1000)
    }

    const isValid = name.trim().length >= 2

    // Loading state
    if (isPageLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center border-b bg-white px-4 py-4">
                <Link href={`/events/${eventId}`} className="mr-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="flex-1 text-center text-lg font-bold text-black pr-12">
                    Edit Event
                </h1>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:max-w-2xl md:mx-auto md:w-full">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        {error && !isPageLoading ? (
                            /* Access / load error */
                            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                                {error}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Logo Upload */}
                                <div className="space-y-2">
                                    <Label>Logo Event (Opsional)</Label>
                                    <div
                                        className={`relative flex h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${preview
                                                ? "border-primary bg-primary/5"
                                                : "border-gray-200 hover:border-primary/50"
                                            }`}
                                    >
                                        {/* File input — only show when no preview */}
                                        {!preview && (
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                                onChange={handleImageChange}
                                                disabled={isCompressing || isSaving}
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
                                                    alt="Logo preview"
                                                    className="h-full w-full rounded-lg object-contain"
                                                />
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    {/* Replace button */}
                                                    <label className="cursor-pointer p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                                                        <Upload className="h-4 w-4" />
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                                            className="hidden"
                                                            onChange={handleImageChange}
                                                            disabled={isCompressing || isSaving}
                                                        />
                                                    </label>
                                                    {/* Remove button */}
                                                    <button
                                                        type="button"
                                                        onClick={clearImage}
                                                        className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <div className="rounded-full bg-gray-100 p-4">
                                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Tap untuk upload logo baru
                                                    </span>
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
                                                Dikompres: {formatFileSize(originalSize)} → {formatFileSize(compressedSize)}{" "}
                                                ({Math.round((1 - compressedSize / originalSize) * 100)}% lebih kecil)
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
                                        onChange={(e) => {
                                            setName(e.target.value)
                                            setError(null)
                                        }}
                                        className="h-11"
                                        maxLength={100}
                                    />
                                    <p className="text-xs text-gray-500">
                                        Minimal 2 karakter, maksimal 100 karakter
                                    </p>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="rounded-lg bg-red-50 p-4">
                                        <p className="text-sm text-red-600">{error}</p>
                                    </div>
                                )}

                                {/* Success */}
                                {success && (
                                    <div className="rounded-lg bg-green-50 p-4 flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-600" />
                                        <p className="text-sm text-green-600">Event berhasil diperbarui!</p>
                                    </div>
                                )}

                                {/* Submit */}
                                <Button
                                    type="submit"
                                    className="h-11 w-full text-base"
                                    disabled={isSaving || !isValid || success || isCompressing}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : success ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Berhasil!
                                        </>
                                    ) : (
                                        "Simpan Perubahan"
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
