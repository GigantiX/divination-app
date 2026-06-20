"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { updateDisplayName, type UserProfile } from "@/app/actions/profile"

interface EditProfileClientProps {
    profile: UserProfile
}

export function EditProfileClient({ profile }: EditProfileClientProps) {
    const router = useRouter()
    const [displayName, setDisplayName] = React.useState(profile.full_name || "")
    const [isSaving, setIsSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState(false)

    const hasChanges = displayName !== profile.full_name

    const handleSave = async () => {
        if (!hasChanges) return

        setIsSaving(true)
        setError(null)

        const result = await updateDisplayName(displayName)

        if (result.error) {
            setError(result.error)
            setIsSaving(false)
            return
        }

        setSuccess(true)
        setIsSaving(false)

        // Redirect back after brief success message
        setTimeout(() => {
            router.push('/settings')
        }, 1000)
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900">Edit Profil</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:max-w-md md:mx-auto md:w-full">
                {/* Avatar Preview */}
                <div className="flex justify-center mb-6">
                    <AvatarEmoji
                        emoji={profile.emoji || "😀"}
                        size="xl"
                        className="border-4 border-white shadow-lg"
                    />
                </div>

                {/* Form */}
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {/* Display Name Field */}
                            <div>
                                <label
                                    htmlFor="displayName"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Nama Tampilan
                                </label>
                                <Input
                                    id="displayName"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Masukkan nama tampilan"
                                    className="h-12 rounded-xl"
                                    maxLength={100}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Nama ini akan ditampilkan di profil Anda
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    Profil berhasil diperbarui!
                                </div>
                            )}

                            {/* Save Button */}
                            <Button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving || success}
                                className="w-full h-12 rounded-xl font-semibold"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : success ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Tersimpan!
                                    </>
                                ) : (
                                    "Simpan Perubahan"
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Info (read-only) */}
                <div className="mt-4 p-4 rounded-xl bg-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className="text-gray-900 font-medium">{profile.username}</p>
                    <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah</p>
                </div>
            </div>
        </div>
    )
}
