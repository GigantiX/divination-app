"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import {
    ChevronLeft,
    Calendar,
    DollarSign,
    Users,
    ShoppingCart,
    FileText,
    Loader2,
    Check,
    Trash2,
    Percent,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { getReport, updateReport, deleteReport } from "@/app/actions/reports"
import { getBatch } from "@/app/actions/batches"
import { cn } from "@/lib/utils"

export default function EditReportPage() {
    const router = useRouter()
    const params = useParams()
    const eventId = params.id as string
    const reportId = params.reportId as string

    const [isLoading, setIsLoading] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState(false)
    const [batchId, setBatchId] = React.useState("")
    const [batchName, setBatchName] = React.useState<string | null>(null)
    const [reporterName, setReporterName] = React.useState("")

    const [formData, setFormData] = React.useState({
        reportDate: "",
        spend: "",
        leads: "",
        sales: "",
        notes: "",
    })

    type TaxOption = "4" | "11" | "custom"
    const [taxOption, setTaxOption] = React.useState<TaxOption>("11")
    const [customTax, setCustomTax] = React.useState("")

    const getTaxPercentage = (): number => {
        if (taxOption === "custom") return Math.min(100, Math.max(0, parseFloat(customTax) || 0))
        return parseInt(taxOption)
    }

    // Load report data
    React.useEffect(() => {
        const loadReport = async () => {
            const report = await getReport(reportId)
            if (!report) {
                setError("Laporan tidak ditemukan atau tidak memiliki akses.")
                setIsLoading(false)
                return
            }

            setBatchId(report.batch_id)
            // Fetch batch name
            getBatch(report.batch_id).then(batch => {
                if (batch) setBatchName(batch.name)
            })
            const profileData = report.profiles as unknown as { full_name: string; emoji: string } | null
            setReporterName(profileData?.full_name || "Unknown")

            setFormData({
                reportDate: report.report_date,
                spend: formatCurrency(Math.round(Number(report.ads_spent)).toString()),
                leads: report.leads_count.toString(),
                sales: report.closing_count.toString(),
                notes: report.notes || "",
            })

            // Set tax option from saved value
            const savedTax = Number(report.tax_percentage ?? 11)
            if (savedTax === 4) setTaxOption("4")
            else if (savedTax === 11) setTaxOption("11")
            else {
                setTaxOption("custom")
                setCustomTax(savedTax.toString())
            }

            setIsLoading(false)
        }
        loadReport()
    }, [reportId])

    const formatCurrency = (value: string) => {
        const num = value.replace(/\D/g, "")
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }

    const parseCurrency = (value: string): number => {
        return parseInt(value.replace(/\./g, "") || "0", 10)
    }

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        setError(null)
    }

    const handleSpendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCurrency(e.target.value)
        setFormData((prev) => ({ ...prev, spend: formatted }))
        setError(null)
    }

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return ""
        const date = new Date(dateStr)
        return date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setError(null)

        const adsSpent = parseCurrency(formData.spend)
        const leadsCount = parseInt(formData.leads || "0", 10)
        const closingCount = parseInt(formData.sales || "0", 10)

        if (closingCount > leadsCount) {
            setError('Jumlah closing tidak boleh lebih dari leads')
            setIsSaving(false)
            return
        }

        const result = await updateReport(reportId, {
            reportDate: formData.reportDate,
            leadsCount,
            closingCount,
            adsSpent,
            taxPercentage: getTaxPercentage(),
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
            router.refresh()
        }, 1000)
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        setError(null)

        const result = await deleteReport(reportId)

        if (result.error) {
            setError(result.error)
            setIsDeleting(false)
            setShowDeleteConfirm(false)
            return
        }

        router.push(`/events/${eventId}?batch=${batchId}`)
        router.refresh()
    }

    const leadsNum = parseInt(formData.leads || "0", 10)
    const salesNum = parseInt(formData.sales || "0", 10)
    const spendNum = parseCurrency(formData.spend)
    const taxPct = getTaxPercentage()
    const spendWithTax = Math.round(spendNum * (1 + taxPct / 100))
    const isValid = formData.spend && formData.leads && formData.sales && formData.reportDate

    // Loading state
    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col bg-background-secondary">
                <div className="sticky top-0 z-10 border-b bg-white px-4 py-4">
                    <div className="flex items-center">
                        <Link href={`/events/${eventId}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 mr-2">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <h1 className="flex-1 text-center text-lg font-bold text-black pr-10">
                            Edit Laporan
                        </h1>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-4">
                <div className="flex items-center">
                    <Link href={`/events/${eventId}?batch=${batchId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 mr-2">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-black pr-10">
                        Edit Laporan
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:p-6 md:max-w-2xl md:mx-auto md:w-full">
                {/* Batch Info */}
                {batchName && (
                    <div className="mb-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center gap-2">
                        <span className="text-blue-500 text-sm">📋</span>
                        <p className="text-sm text-blue-700">
                            Mengedit laporan di batch <span className="font-semibold">{batchName}</span>
                        </p>
                    </div>
                )}

                {/* Reporter Info */}
                <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">
                        Laporan oleh <span className="font-medium text-gray-700">{reporterName}</span>
                    </p>
                </div>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Date Display */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    Tanggal Laporan
                                </Label>
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                    <p className="text-xs text-blue-600">
                                        📅 {formatDisplayDate(formData.reportDate)}
                                    </p>
                                </div>
                            </div>

                            {/* Metrics Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Metrik Performa
                                </h3>

                                {/* Spend Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="spend" className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-blue-500" />
                                        Ad Spend (IDR) *
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                            Rp
                                        </span>
                                        <Input
                                            id="spend"
                                            name="spend"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={formData.spend}
                                            onChange={handleSpendChange}
                                            required
                                            className="h-12 pl-10"
                                        />
                                    </div>
                                </div>

                                {/* Tax Selector */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Percent className="h-4 w-4 text-amber-500" />
                                        Pajak Meta Ads
                                    </Label>
                                    <div className="flex gap-2">
                                        {(["4", "11", "custom"] as const).map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => setTaxOption(opt)}
                                                className={cn(
                                                    "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                                                    taxOption === opt
                                                        ? "bg-amber-500 text-white shadow-sm"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                )}
                                            >
                                                {opt === "custom" ? "Custom" : `${opt}%`}
                                            </button>
                                        ))}
                                    </div>
                                    {taxOption === "custom" && (
                                        <div className="relative pt-1">
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                placeholder="Masukkan persentase pajak"
                                                value={customTax}
                                                onChange={(e) => setCustomTax(e.target.value)}
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                className="h-11 pr-8"
                                            />
                                            <span className="absolute right-3 top-1/2 translate-y-[-35%] text-gray-400 font-medium">%</span>
                                        </div>
                                    )}
                                    <p className="break-words text-xs leading-relaxed text-gray-400">
                                        Pajak akan ditambahkan ke Ad Spend{spendNum > 0 ? `: Rp ${formatCurrency(spendNum.toString())} + ${taxPct}% = Rp ${formatCurrency(spendWithTax.toString())}` : ""}
                                    </p>
                                </div>

                                {/* Leads & Sales Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="leads" className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-violet-500" />
                                            Leads *
                                        </Label>
                                        <Input
                                            id="leads"
                                            name="leads"
                                            type="number"
                                            inputMode="numeric"
                                            placeholder="0"
                                            min="0"
                                            value={formData.leads}
                                            onChange={handleChange}
                                            required
                                            className="h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="sales" className="flex items-center gap-2">
                                            <ShoppingCart className="h-4 w-4 text-emerald-500" />
                                            Closing *
                                        </Label>
                                        <Input
                                            id="sales"
                                            name="sales"
                                            type="number"
                                            inputMode="numeric"
                                            placeholder="0"
                                            min="0"
                                            max={formData.leads || undefined}
                                            value={formData.sales}
                                            onChange={handleChange}
                                            required
                                            className="h-12"
                                        />
                                    </div>
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
                                    placeholder="Tambahkan catatan..."
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="min-h-[100px] resize-none"
                                    maxLength={500}
                                />
                            </div>

                            {/* Quick Stats Preview */}
                            {(formData.spend || formData.leads) && (
                                <div className="rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 p-4">
                                    <p className="text-xs font-semibold text-gray-600 mb-2">
                                        PREVIEW
                                    </p>
                                    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Total + Pajak</p>
                                            <p className="break-words text-base font-bold leading-tight text-blue-600 sm:text-lg">
                                                {spendWithTax > 0
                                                    ? `Rp ${formatCurrency(spendWithTax.toString())}`
                                                    : "-"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">CPR</p>
                                            <p className="break-words text-base font-bold leading-tight text-violet-600 sm:text-lg">
                                                {spendWithTax > 0 && salesNum > 0
                                                    ? `Rp ${formatCurrency(Math.round(spendWithTax / salesNum).toString())}`
                                                    : "-"}
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-sm text-gray-500">Conv. Rate</p>
                                            <p className="text-base font-bold leading-tight text-emerald-500 sm:text-lg">
                                                {leadsNum > 0 && salesNum >= 0
                                                    ? `${((salesNum / leadsNum) * 100).toFixed(1)}%`
                                                    : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                    <p className="text-sm text-green-600">
                                        Laporan berhasil diperbarui!
                                    </p>
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

                        {/* Delete Section */}
                        <div className="mt-6 border-t pt-6">
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Hapus Laporan
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-center text-sm text-gray-600">
                                        Yakin ingin menghapus laporan ini?
                                    </p>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            disabled={isDeleting}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            className="flex-1 bg-red-600 text-white hover:bg-red-700"
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Menghapus...
                                                </>
                                            ) : (
                                                "Ya, Hapus"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
