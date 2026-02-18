"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ChevronLeft, Calendar, DollarSign, Users, ShoppingCart, FileText, Loader2, Check, Percent } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createReport } from "@/app/actions/reports"
import { getBatch } from "@/app/actions/batches"

type DateOption = "today" | "yesterday" | "custom"

// Get today's date in Jakarta timezone (UTC+7)
const getJakartaDate = () => {
    const now = new Date()
    const jakartaOffset = 7 * 60
    const localOffset = now.getTimezoneOffset()
    const jakartaTime = new Date(now.getTime() + (jakartaOffset + localOffset) * 60 * 1000)
    return jakartaTime.toISOString().split('T')[0]
}

const getYesterdayDate = () => {
    const today = new Date(getJakartaDate())
    today.setDate(today.getDate() - 1)
    return today.toISOString().split('T')[0]
}

export default function NewReportPage() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const eventId = params.id as string
    const batchId = searchParams.get('batch') || ''

    const todayDate = getJakartaDate()
    const yesterdayDate = getYesterdayDate()

    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState(false)
    const [dateOption, setDateOption] = React.useState<DateOption>("today")
    const [customDate, setCustomDate] = React.useState(todayDate)
    const [batchName, setBatchName] = React.useState<string | null>(null)

    // Fetch batch name
    React.useEffect(() => {
        if (batchId) {
            getBatch(batchId).then(batch => {
                if (batch) setBatchName(batch.name)
            })
        }
    }, [batchId])

    const [formData, setFormData] = React.useState({
        spend: "",
        leads: "",
        sales: "",
        notes: ""
    })

    type TaxOption = "4" | "11" | "custom"
    const [taxOption, setTaxOption] = React.useState<TaxOption>("11")
    const [customTax, setCustomTax] = React.useState("")

    const getTaxPercentage = (): number => {
        if (taxOption === "custom") return Math.min(100, Math.max(0, parseFloat(customTax) || 0))
        return parseInt(taxOption)
    }

    const getReportDate = () => {
        switch (dateOption) {
            case "today":
                return todayDate
            case "yesterday":
                return yesterdayDate
            case "custom":
                return customDate
        }
    }

    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError(null)
    }

    const formatCurrency = (value: string) => {
        const num = value.replace(/\D/g, '')
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }

    const handleSpendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCurrency(e.target.value)
        setFormData(prev => ({ ...prev, spend: formatted }))
        setError(null)
    }

    const parseCurrency = (value: string): number => {
        return parseInt(value.replace(/\./g, '') || '0', 10)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        if (!batchId) {
            setError('Batch tidak ditemukan. Silakan kembali dan pilih batch.')
            setIsLoading(false)
            return
        }

        const reportDate = getReportDate()
        const adsSpent = parseCurrency(formData.spend)
        const leadsCount = parseInt(formData.leads || '0', 10)
        const closingCount = parseInt(formData.sales || '0', 10)

        if (closingCount > leadsCount) {
            setError('Jumlah closing tidak boleh lebih dari leads')
            setIsLoading(false)
            return
        }

        const result = await createReport({
            batchId,
            reportDate,
            leadsCount,
            closingCount,
            adsSpent,
            taxPercentage: getTaxPercentage(),
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
            router.push(`/events/${eventId}?batch=${batchId}`)
            router.refresh()
        }, 1000)
    }

    const reportDate = getReportDate()
    const leadsNum = parseInt(formData.leads || '0', 10)
    const salesNum = parseInt(formData.sales || '0', 10)
    const spendNum = parseCurrency(formData.spend)
    const taxPct = getTaxPercentage()
    const spendWithTax = Math.round(spendNum * (1 + taxPct / 100))
    const isValid = formData.spend && formData.leads && formData.sales && batchId

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
                        Tambah Laporan
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:p-6 md:max-w-2xl md:mx-auto md:w-full">
                {/* No batch warning */}
                {!batchId && (
                    <div className="mb-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
                        ⚠️ Batch tidak ditemukan. Silakan kembali ke halaman event dan pilih batch terlebih dahulu.
                    </div>
                )}

                {/* Batch Info */}
                {batchId && batchName && (
                    <div className="mb-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center gap-2">
                        <span className="text-blue-500 text-sm">📋</span>
                        <p className="text-sm text-blue-700">
                            Menambah laporan ke batch <span className="font-semibold">{batchName}</span>
                        </p>
                    </div>
                )}

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Date Selection */}
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    Tanggal Laporan
                                </Label>

                                {/* Date Chips */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDateOption("today")}
                                        className={cn(
                                            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                                            dateOption === "today"
                                                ? "bg-primary text-white shadow-sm"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        Hari ini
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateOption("yesterday")}
                                        className={cn(
                                            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                                            dateOption === "yesterday"
                                                ? "bg-primary text-white shadow-sm"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        Kemarin
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateOption("custom")}
                                        className={cn(
                                            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                                            dateOption === "custom"
                                                ? "bg-primary text-white shadow-sm"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        Pilih Tanggal
                                    </button>
                                </div>

                                {/* Custom Date Picker */}
                                {dateOption === "custom" && (
                                    <div className="pt-2">
                                        <div
                                            className="relative cursor-pointer"
                                            onClick={() => (document.getElementById('customDate') as HTMLInputElement)?.showPicker?.()}
                                        >
                                            <Input
                                                id="customDate"
                                                type="date"
                                                value={customDate}
                                                max={todayDate}
                                                onChange={(e) => setCustomDate(e.target.value)}
                                                className="h-11 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Selected Date Display */}
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                    <p className="text-xs text-blue-600">
                                        📅 {formatDisplayDate(reportDate)}
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
                                    <p className="text-xs text-gray-400">
                                        Pajak akan ditambahkan ke Ad Spend{spendNum > 0 ? `: Rp ${formatCurrency(spendNum.toString())} + ${taxPct}% = Rp ${formatCurrency(spendWithTax.toString())}` : ""}
                                    </p>
                                </div>

                                {/* Leads & Sales Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Leads Field */}
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

                                    {/* Sales Field */}
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
                                    placeholder="Tambahkan catatan tentang performa hari ini..."
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="min-h-[100px] resize-none"
                                    maxLength={500}
                                />
                            </div>

                            {/* Quick Stats Preview */}
                            {(formData.spend || formData.leads) && (
                                <div className="rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 p-4">
                                    <p className="text-xs font-semibold text-gray-600 mb-2">PREVIEW</p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500">Total + Pajak</p>
                                            <p className="text-lg font-bold text-blue-600">
                                                {spendWithTax > 0
                                                    ? `Rp ${formatCurrency(spendWithTax.toString())}`
                                                    : '-'
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">CPL</p>
                                            <p className="text-lg font-bold text-violet-600">
                                                {spendWithTax > 0 && leadsNum > 0
                                                    ? `Rp ${formatCurrency(Math.round(spendWithTax / leadsNum).toString())}`
                                                    : '-'
                                                }
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">Conv. Rate</p>
                                            <p className="text-lg font-bold text-emerald-500">
                                                {leadsNum > 0 && salesNum >= 0
                                                    ? `${((salesNum / leadsNum) * 100).toFixed(1)}%`
                                                    : '-'
                                                }
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
                                    <p className="text-sm text-green-600">Laporan berhasil disimpan!</p>
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
                                        Menyimpan Laporan...
                                    </>
                                ) : success ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Berhasil!
                                    </>
                                ) : (
                                    "Simpan Laporan"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Helper Text */}
                <p className="mt-4 text-center text-xs text-gray-400">
                    Laporan disimpan ke batch yang sedang aktif
                </p>
            </div>
        </div>
    )
}
