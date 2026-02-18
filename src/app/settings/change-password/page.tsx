"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Eye, EyeOff, Info, Loader2, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "@/app/actions/settings"

export default function ChangePasswordPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
    const [showNewPassword, setShowNewPassword] = React.useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
    const [serverError, setServerError] = React.useState("")
    const [success, setSuccess] = React.useState(false)

    const [formData, setFormData] = React.useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    })

    const [errors, setErrors] = React.useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    })

    const validateForm = () => {
        const newErrors = {
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
        }

        if (!formData.currentPassword) {
            newErrors.currentPassword = "Kata sandi saat ini harus diisi"
        }

        if (!formData.newPassword) {
            newErrors.newPassword = "Kata sandi baru harus diisi"
        } else if (formData.newPassword.length < 8) {
            newErrors.newPassword = "Kata sandi minimal 8 karakter"
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Konfirmasi kata sandi harus diisi"
        } else if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = "Kata sandi tidak cocok"
        }

        setErrors(newErrors)
        return !newErrors.currentPassword && !newErrors.newPassword && !newErrors.confirmPassword
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setServerError("")

        if (!validateForm()) return

        setIsSubmitting(true)

        const result = await changePassword({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
        })

        if (result.error) {
            setServerError(result.error)
            setIsSubmitting(false)
            return
        }

        setSuccess(true)
        setIsSubmitting(false)

        // Redirect after brief success display
        setTimeout(() => router.push("/settings"), 1500)
    }

    return (
        <div className="flex min-h-screen flex-col bg-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white px-4 py-4 border-b">
                <div className="flex items-center gap-3 md:max-w-2xl md:mx-auto">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold text-black">Ubah Kata Sandi</h1>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="flex-1 p-4 md:max-w-2xl md:mx-auto md:w-full space-y-6">
                    {/* Success Message */}
                    {success && (
                        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <p className="text-sm font-medium text-green-700">
                                Kata sandi berhasil diubah! Mengalihkan...
                            </p>
                        </div>
                    )}

                    {/* Server Error */}
                    {serverError && (
                        <div className="rounded-xl bg-red-50 px-4 py-3">
                            <p className="text-sm font-medium text-red-600">{serverError}</p>
                        </div>
                    )}
                    {/* Current Password */}
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                            Kata Sandi Saat Ini
                        </Label>
                        <div className="relative">
                            <Input
                                id="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Masukkan kata sandi lama"
                                value={formData.currentPassword}
                                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                className="h-12 pr-12 rounded-2xl border-gray-200"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showCurrentPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.currentPassword && (
                            <p className="text-sm text-red-500">{errors.currentPassword}</p>
                        )}
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                            Kata Sandi Baru
                        </Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Buat kata sandi baru"
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                className="h-12 pr-12 rounded-2xl border-gray-200"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showNewPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Info className="h-3.5 w-3.5" />
                            <span>Minimal 8 karakter</span>
                        </div>
                        {errors.newPassword && (
                            <p className="text-sm text-red-500">{errors.newPassword}</p>
                        )}
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                            Konfirmasi Kata Sandi Baru
                        </Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Ulangi kata sandi baru"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="h-12 pr-12 rounded-2xl border-gray-200"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                        )}
                    </div>
                </div>

                {/* Submit Button - Fixed at bottom */}
                <div className="sticky bottom-0 p-4 bg-white border-t md:max-w-2xl md:mx-auto md:w-full">
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 text-base font-semibold"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Memperbarui...
                            </>
                        ) : (
                            "Perbarui Kata Sandi"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
