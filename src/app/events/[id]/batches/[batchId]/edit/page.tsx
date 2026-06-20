"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import {
    ChevronLeft,
    Calendar,
    Hash,
    FileText,
    Loader2,
    Check,
    Banknote,
    Layers,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { getBatch, updateBatch } from "@/app/actions/batches"

// Get today's date in Jakarta timezone (UTC+7)
const getJakartaDate = () => {
    const now = new Date()
    const jakartaOffset = 7 * 60 // UTC+7 in minutes
    const localOffset = now.getTimezoneOffset()
    const jakartaTime = new Date(now.getTime() + (jakartaOffset + localOffset) * 60 * 1000)
    return jakartaTime.toISOString().split('T')[0]
}

export default function EditBatchPage() {
    const router = useRouter()
    const params = useParams()
    const eventId = params.id as string
    const batchId = params.batchId as string

    const [isPageLoading, setIsPageLoading] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState(false)
    const [isOngoing, setIsOngoing] = React.useState(false)
    const [batchName, setBatchName] = React.useState("") // Original name for header display

    const [formData, setFormData] = React.useState({
        name: "",
        startDate: "",
        endDate: "",
        price: "",
        notes: "",
    })

    // Load current batch data
    React.useEffect(() => {
        const load = async () => {
            const batch = await getBatch(batchId)
            if (!batch) {
                setError("Batch tidak ditemukan atau tidak memiliki akses.")
                setIsPageLoading(false)
                return
            }

            const priceValue = Number(batch.price || 0)
            setBatchName(batch.name)
            setFormData({
                name: batch.name,
                startDate: batch.start_date,
                endDate: batch.end_date || "",
                price: priceValue > 0 ? priceValue.toLocaleString('id-ID') : "",
                notes: batch.notes || "",
            })
            setIsOngoing(!batch.end_date)
            setIsPageLoading(false)
        }
        load()
    }, [batchId])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError(null)
    }

    const handleOngoingToggle = () => {
        setIsOngoing(!isOngoing)
        if (!isOngoing) {
            setFormData(prev => ({ ...prev, endDate: "" }))
        }
    }

    const formatRupiah = (value: string) => {
        const number = value.replace(/\D/g, '')
        if (!number) return ''
        return Number(number).toLocaleString('id-ID')
    }

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '')
        setFormData(prev => ({ ...prev, price: raw ? formatRupiah(raw) : '' }))
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setError(null)

        const result = await updateBatch(batchId, {
            name: formData.name,
            startDate: formData.startDate,
            endDate: isOngoing ? null : formData.endDate || null,
            price: formData.price ? Number(formData.price.replace(/\D/g, '')) : 0,
            notes: formData.notes || undefined,
        })

        if (result.error) {
            setError(result.error)
            setIsSaving(false)
            return
        }

        setSuccess(true)
        setIsSaving(false)

        setTimeout(() => {
            router.push(`/events/${eventId}?batch=${batchId}`)
        }, 1000)
    }

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return "Sekarang"
        const date = new Date(dateStr)
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const isValid = formData.name.trim().length >= 1 && formData.startDate && (isOngoing || formData.endDate)

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
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-4">
                <div className="flex items-center">
                    <Link href={`/events/${eventId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 mr-2">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-black pr-10">
                        Edit Batch
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:p-6 md:max-w-2xl md:mx-auto md:w-full">
                {/* Current Batch Indicator */}
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3">
                    <Layers className="h-4 w-4 text-blue-500" />
                    <p className="text-sm text-blue-700">
                        Mengedit: <span className="font-semibold">{batchName}</span>
                    </p>
                </div>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        {error && isPageLoading ? (
                            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                                {error}
                            </div>
                        ) : (
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
                                            📅 {formData.name || "Batch"}: {formatDisplayDate(formData.startDate)} - {isOngoing ? "Sekarang" : formatDisplayDate(formData.endDate)}
                                        </p>
                                    </div>
                                </div>

                                {/* Price Section */}
                                <div className="space-y-2">
                                    <Label htmlFor="price" className="flex items-center gap-2">
                                        <Banknote className="h-4 w-4 text-emerald-500" />
                                        Harga Tiket (Opsional)
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                                            Rp
                                        </span>
                                        <Input
                                            id="price"
                                            name="price"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={formData.price}
                                            onChange={handlePriceChange}
                                            className="h-12 pl-10"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Harga tiket per orang untuk batch ini
                                    </p>
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
                                        <p className="text-sm text-green-600">Batch berhasil diperbarui!</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    className="h-12 w-full text-base font-semibold"
                                    disabled={isSaving || !isValid || success}
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
