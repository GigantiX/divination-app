"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, Calendar, Hash, FileText, Loader2, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { createBatch } from "@/app/actions/batches"

// Get today's date in Jakarta timezone (UTC+7)
const getJakartaDate = () => {
    const now = new Date()
    const jakartaOffset = 7 * 60 // UTC+7 in minutes
    const localOffset = now.getTimezoneOffset()
    const jakartaTime = new Date(now.getTime() + (jakartaOffset + localOffset) * 60 * 1000)
    return jakartaTime.toISOString().split('T')[0]
}

export default function NewBatchPage() {
    const router = useRouter()
    const params = useParams()
    const eventId = params.id as string

    const todayDate = getJakartaDate()

    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState(false)
    const [isOngoing, setIsOngoing] = React.useState(true) // Default to ongoing
    const [formData, setFormData] = React.useState({
        name: "",
        startDate: todayDate,
        endDate: "",
        notes: ""
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError(null)
    }

    const handleOngoingToggle = () => {
        setIsOngoing(!isOngoing)
        if (!isOngoing) {
            // Switching to ongoing, clear end date
            setFormData(prev => ({ ...prev, endDate: "" }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const result = await createBatch({
            eventId,
            name: formData.name,
            startDate: formData.startDate,
            endDate: isOngoing ? null : formData.endDate || null,
            notes: formData.notes || undefined,
        })

        if (result.error) {
            setError(result.error)
            setIsLoading(false)
            return
        }

        setSuccess(true)
        setIsLoading(false)

        // Redirect to event detail after brief success message
        setTimeout(() => {
            router.push(`/events/${eventId}?batch=${result.batchId}`)
            router.refresh()
        }, 1000)
    }

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return "Sekarang"
        const date = new Date(dateStr)
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const isValid = formData.name.trim().length >= 1 && formData.startDate && (isOngoing || formData.endDate)

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-4">
                <div className="flex items-center">
                    <Link href={`/events/${eventId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 mr-2">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-black pr-10">
                        Tambah Batch Baru
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:p-6 md:max-w-2xl md:mx-auto md:w-full">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Batch Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-blue-500" />
                                    Nama Batch *
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    placeholder="e.g. Batch 13"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    maxLength={100}
                                    className="h-12"
                                />
                            </div>

                            {/* Date Range Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    Periode Batch
                                </h3>

                                {/* Ongoing Toggle */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Batch Aktif Terus</p>
                                        <p className="text-xs text-gray-500">Tanpa tanggal selesai</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleOngoingToggle}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isOngoing ? "bg-green-500" : "bg-gray-300"
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOngoing ? "translate-x-6" : "translate-x-1"
                                                }`}
                                        />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Start Date */}
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate" className="text-xs text-gray-500">
                                            Tanggal Mulai *
                                        </Label>
                                        <div
                                            className="relative cursor-pointer"
                                            onClick={() => (document.getElementById('startDate') as HTMLInputElement)?.showPicker?.()}
                                        >
                                            <Input
                                                id="startDate"
                                                name="startDate"
                                                type="date"
                                                value={formData.startDate}
                                                onChange={(e) => {
                                                    handleChange(e)
                                                    if (!isOngoing && formData.endDate && e.target.value > formData.endDate) {
                                                        setFormData(prev => ({ ...prev, endDate: "" }))
                                                    }
                                                }}
                                                required
                                                className="h-11 cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* End Date */}
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate" className="text-xs text-gray-500">
                                            Tanggal Selesai {isOngoing && "(Opsional)"}
                                        </Label>
                                        <div
                                            className={`relative ${isOngoing ? "opacity-50" : "cursor-pointer"}`}
                                            onClick={() => !isOngoing && (document.getElementById('endDate') as HTMLInputElement)?.showPicker?.()}
                                        >
                                            <Input
                                                id="endDate"
                                                name="endDate"
                                                type="date"
                                                value={isOngoing ? "" : formData.endDate}
                                                min={formData.startDate}
                                                onChange={handleChange}
                                                disabled={isOngoing}
                                                placeholder={isOngoing ? "Aktif terus" : ""}
                                                className={`h-11 ${isOngoing ? "bg-gray-100" : "cursor-pointer"}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Period Preview */}
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                    <p className="text-xs text-blue-600">
                                        📅 {formData.name || "Batch Baru"}: {formatDisplayDate(formData.startDate)} - {isOngoing ? "Sekarang" : formatDisplayDate(formData.endDate)}
                                    </p>
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    Catatan (Opsional)
                                </Label>
                                <Textarea
                                    id="notes"
                                    name="notes"
                                    placeholder="Tambahkan catatan tentang batch ini..."
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="min-h-[100px] resize-none"
                                    maxLength={500}
                                />
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
                                    <p className="text-sm text-green-600">Batch berhasil dibuat!</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="h-12 w-full text-base font-semibold"
                                disabled={isLoading || !isValid || success}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Membuat Batch...
                                    </>
                                ) : success ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Berhasil!
                                    </>
                                ) : (
                                    "Buat Batch"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Helper Text */}
                <p className="mt-4 text-center text-xs text-gray-400">
                    Batch baru akan otomatis aktif setelah dibuat
                </p>
            </div>
        </div>
    )
}
