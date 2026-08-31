"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ChevronLeft, Calendar, DollarSign, Users, ShoppingCart, FileText, Loader2, Check, Percent, RefreshCw, Facebook } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import { createReport, createReportRange } from "@/app/actions/reports"
import { getBatch } from "@/app/actions/batches"
import { getFacebookAdAccounts, getFacebookAdsSpend, getFacebookCampaigns } from "@/app/actions/facebook-ads"
import type { FacebookAdAccount, FacebookCampaign } from "@/app/actions/facebook-ads"

type DateOption = "today" | "yesterday" | "custom" | "range"

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

const strToDate = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
}

const dateToStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function NewReportPage() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const eventId = params.id as string
    const batchId = searchParams.get('batch') || ''

    const todayDate = getJakartaDate()
    const yesterdayDate = getYesterdayDate()
    const todayDateObj = strToDate(todayDate)

    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState(false)
    const [successMsg, setSuccessMsg] = React.useState<string>("")
    const [dateOption, setDateOption] = React.useState<DateOption>("today")
    const [customDate, setCustomDate] = React.useState<Date | undefined>(todayDateObj)
    const [rangeDate, setRangeDate] = React.useState<DateRange | undefined>(undefined)
    const [batchName, setBatchName] = React.useState<string | null>(null)

    // Fetch batch name
    React.useEffect(() => {
        if (batchId) {
            getBatch(batchId).then(batch => {
                if (batch) setBatchName(batch.name)
            })
        }
    }, [batchId])

    // Fetch Facebook ad accounts on mount
    React.useEffect(() => {
        getFacebookAdAccounts().then(result => {
            setFbLoadingAccounts(false)
            if (result.success && result.adAccounts && result.adAccounts.length > 0) {
                setFbAdAccounts(result.adAccounts)
            } else if (result.error) {
                if (result.tokenExpired) {
                    setFbError(result.error)
                }
            }
        })
    }, [])

    const [formData, setFormData] = React.useState({
        spend: "",
        leads: "",
        sales: "",
        notes: ""
    })

    // Facebook Ads integration
    const [fbAdAccounts, setFbAdAccounts] = React.useState<FacebookAdAccount[]>([])
    const [fbSelectedAccount, setFbSelectedAccount] = React.useState("")
    const [fbSpendMode, setFbSpendMode] = React.useState<"account" | "campaign">("account")
    const [fbCampaigns, setFbCampaigns] = React.useState<FacebookCampaign[]>([])
    const [fbSelectedCampaign, setFbSelectedCampaign] = React.useState("")
    const [fbCampaignSearch, setFbCampaignSearch] = React.useState("")
    const [fbCampaignsLoadedFor, setFbCampaignsLoadedFor] = React.useState("")
    const [fbLoadingCampaigns, setFbLoadingCampaigns] = React.useState(false)
    const [fbLoadingAccounts, setFbLoadingAccounts] = React.useState(true)
    const [fbFetchSpendLoading, setFbFetchSpendLoading] = React.useState(false)
    const [fbError, setFbError] = React.useState<string | null>(null)
    const [fbSpendSuccess, setFbSpendSuccess] = React.useState(false)

    type TaxOption = "4" | "11" | "custom"
    const [taxOption, setTaxOption] = React.useState<TaxOption>("11")
    const [customTax, setCustomTax] = React.useState("")

    const getTaxPercentage = (): number => {
        if (taxOption === "custom") return Math.min(100, Math.max(0, parseFloat(customTax) || 0))
        return parseInt(taxOption)
    }

    // Returns a single YYYY-MM-DD string for single-date modes
    const getSingleReportDate = () => {
        switch (dateOption) {
            case "today": return todayDate
            case "yesterday": return yesterdayDate
            case "custom": return customDate ? dateToStr(customDate) : todayDate
            default: return todayDate
        }
    }

    // For Facebook fetch — returns start date + optional end date (for range mode)
    const getReportDateForFb = () => {
        if (dateOption === "range" && rangeDate?.from) {
            return {
                date: dateToStr(rangeDate.from),
                endDate: rangeDate.to ? dateToStr(rangeDate.to) : undefined,
            }
        }
        return { date: getSingleReportDate(), endDate: undefined }
    }

    const formatDisplayDate = (dateStr: string) => {
        const date = strToDate(dateStr)
        return format(date, "d MMM yyyy", { locale: idLocale })
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

    const handleGetAdsSpend = async () => {
        if (!fbSelectedAccount) return
        setFbFetchSpendLoading(true)
        setFbError(null)
        setFbSpendSuccess(false)
        const { date, endDate } = getReportDateForFb()
        if (fbSpendMode === "campaign" && !fbSelectedCampaign) {
            setFbError('Pilih campaign terlebih dahulu')
            setFbFetchSpendLoading(false)
            return
        }
        const result = await getFacebookAdsSpend(fbSelectedAccount, date, endDate, fbSpendMode === "campaign" ? fbSelectedCampaign : undefined)
        if (result.success && result.spend !== undefined) {
            const spendValue = Math.round(result.spend).toString()
            setFormData(prev => ({ ...prev, spend: formatCurrency(spendValue) }))
            setFbSpendSuccess(true)
            setError(null)
        } else if (result.tokenExpired) {
            setFbError(result.error || 'Token Facebook telah kedaluwarsa. Silakan hubungkan ulang.')
        } else {
            if (result.spend === 0 && result.success) {
                setFbError('Tidak ada data spend untuk tanggal ini. Silakan masukkan secara manual.')
            } else {
                setFbError(result.error || 'Gagal mengambil data spend')
            }
        }
        setFbFetchSpendLoading(false)
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

        const adsSpent = parseCurrency(formData.spend)
        const leadsCount = parseInt(formData.leads || '0', 10)
        const closingCount = parseInt(formData.sales || '0', 10)

        if (closingCount > leadsCount) {
            setError('Jumlah closing tidak boleh lebih dari leads')
            setIsLoading(false)
            return
        }

        // ── Range mode ────────────────────────────────────────────────────────
        if (dateOption === "range") {
            if (!rangeDate?.from || !rangeDate?.to) {
                setError('Pilih tanggal mulai dan akhir untuk range laporan')
                setIsLoading(false)
                return
            }

            const result = await createReportRange({
                batchId,
                startDate: dateToStr(rangeDate.from),
                endDate: dateToStr(rangeDate.to),
                totalLeadsCount: leadsCount,
                totalClosingCount: closingCount,
                totalAdsSpent: adsSpent,
                taxPercentage: getTaxPercentage(),
                notes: formData.notes || undefined,
            })

            if (result.error) {
                setError(result.error)
                setIsLoading(false)
                return
            }

            const skipNote = result.skipped > 0 ? ` (${result.skipped} tanggal dilewati karena sudah ada)` : ""
            setSuccessMsg(`${result.created} laporan berhasil dibuat!${skipNote}`)
            setSuccess(true)
            setIsLoading(false)
            setTimeout(() => {
                router.push(`/events/${eventId}?batch=${batchId}`)
                router.refresh()
            }, 1500)
            return
        }

        // ── Single date mode ──────────────────────────────────────────────────
        const result = await createReport({
            batchId,
            reportDate: getSingleReportDate(),
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

        setSuccessMsg("Laporan berhasil disimpan!")
        setSuccess(true)
        setIsLoading(false)
        setTimeout(() => {
            router.push(`/events/${eventId}?batch=${batchId}`)
            router.refresh()
        }, 1000)
    }

    const reportDate = getSingleReportDate()
    const leadsNum = parseInt(formData.leads || '0', 10)
    const salesNum = parseInt(formData.sales || '0', 10)
    const spendNum = parseCurrency(formData.spend)
    const taxPct = getTaxPercentage()
    const spendWithTax = Math.round(spendNum * (1 + taxPct / 100))
    const isValid = formData.spend && formData.leads && formData.sales && batchId

    // Range date label
    const rangeDaysCount =
        rangeDate?.from && rangeDate?.to
            ? Math.round((rangeDate.to.getTime() - rangeDate.from.getTime()) / 86400000) + 1
            : null

    const dateChips: { key: DateOption; label: string }[] = [
        { key: "today", label: "Hari ini" },
        { key: "yesterday", label: "Kemarin" },
        { key: "custom", label: "Pilih Tanggal" },
        { key: "range", label: "Range Tanggal" },
    ]

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

                                {/* Date Chips — 2×2 grid on mobile */}
                                <div className="grid grid-cols-2 gap-2">
                                    {dateChips.map(chip => (
                                        <button
                                            key={chip.key}
                                            type="button"
                                            onClick={() => setDateOption(chip.key)}
                                            className={cn(
                                                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                                                dateOption === chip.key
                                                    ? chip.key === "range"
                                                        ? "bg-violet-600 text-white shadow-sm"
                                                        : "bg-primary text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom single date picker */}
                                {dateOption === "custom" && (
                                    <div className="pt-1">
                                        <DatePicker
                                            mode="single"
                                            selected={customDate}
                                            onSelect={setCustomDate}
                                            max={todayDateObj}
                                            placeholder="Pilih tanggal"
                                        />
                                    </div>
                                )}

                                {/* Range date picker */}
                                {dateOption === "range" && (
                                    <div className="pt-1 space-y-2">
                                        <DatePicker
                                            mode="range"
                                            selected={rangeDate}
                                            onSelect={setRangeDate}
                                            max={todayDateObj}
                                            placeholder="Pilih tanggal mulai – akhir"
                                        />
                                        {rangeDaysCount && (
                                            <p className="text-xs text-violet-600 font-medium">
                                                📆 {rangeDaysCount} hari dipilih — laporan akan dibagi rata per hari
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Selected Date Display */}
                                {dateOption !== "range" && (
                                    <div className="rounded-lg bg-blue-50 px-3 py-2">
                                        <p className="text-xs text-blue-600">
                                            📅 {formatDisplayDate(reportDate)}
                                        </p>
                                    </div>
                                )}
                                {dateOption === "range" && rangeDate?.from && rangeDate?.to && (
                                    <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2">
                                        <p className="text-xs text-violet-700 font-medium">
                                            📅 {format(rangeDate.from, "d MMM yyyy", { locale: idLocale })} – {format(rangeDate.to, "d MMM yyyy", { locale: idLocale })}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Facebook Ads Spend Fetcher */}
                            {fbLoadingAccounts && (
                                <div className="flex items-center gap-2 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    <span className="text-sm text-gray-400">Memeriksa koneksi Facebook...</span>
                                </div>
                            )}
                            {fbLoadingAccounts === false && (
                                <div className="space-y-3">
                                    {fbError && fbError.includes('kedaluwarsa') && (
                                        <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
                                            <p className="mb-2">{fbError}</p>
                                            <Link
                                                href="/settings"
                                                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                                            >
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                Hubungkan Ulang di Pengaturan
                                            </Link>
                                        </div>
                                    )}

                                    {fbAdAccounts.length > 0 && (
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2">
                                                <Facebook className="h-4 w-4 text-blue-600" />
                                                Akun Iklan Facebook
                                            </Label>

                                            <div className="flex gap-2">
                                                <select
                                                    value={fbSelectedAccount}
                                                     onChange={(e) => {
                                                         setFbSelectedAccount(e.target.value)
                                                         setFbSpendMode("account")
                                                         setFbCampaigns([])
                                                         setFbSelectedCampaign("")
                                                         setFbCampaignSearch("")
                                                         setFbCampaignsLoadedFor("")
                                                         setFbSpendSuccess(false)
                                                         setFbError(null)
                                                     }}
                                                    className="flex-1 h-11 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                >
                                                    <option value="">Pilih akun iklan...</option>
                                                    {fbAdAccounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.name} ({acc.currency})
                                                        </option>
                                                    ))}
                                                </select>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleGetAdsSpend}
                                                    disabled={!fbSelectedAccount || fbFetchSpendLoading}
                                                    className="h-11 px-4 whitespace-nowrap"
                                                >
                                                    {fbFetchSpendLoading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <DollarSign className="h-4 w-4 mr-1" />
                                                            Get Ads Spend
                                                        </>
                                                    )}
                                                </Button>
                                            </div>

                                            <div className="flex gap-2">
                                                 {(["account", "campaign"] as const).map(mode => (
                                                     <button
                                                         key={mode}
                                                         type="button"
                                                         disabled={mode === "campaign" && !fbSelectedAccount}
                                                         onClick={async () => {
                                                             if (mode === "campaign" && fbLoadingCampaigns) return
                                                             setFbSpendMode(mode)
                                                             setFbSpendSuccess(false)
                                                             setFbError(null)
                                                             if (mode === "campaign" && fbCampaignsLoadedFor !== fbSelectedAccount) {
                                                                 setFbLoadingCampaigns(true)
                                                                 const result = await getFacebookCampaigns(fbSelectedAccount)
                                                                 setFbLoadingCampaigns(false)
                                                                 if (result.success) {
                                                                     setFbCampaigns(result.campaigns || [])
                                                                     setFbCampaignsLoadedFor(fbSelectedAccount)
                                                                 } else {
                                                                     setFbError(result.error || 'Gagal mengambil data campaign')
                                                                 }
                                                             }
                                                         }}
                                                         className={cn(
                                                             "flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all",
                                                             fbSpendMode === mode ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                         )}
                                                     >
                                                         {mode === "account" ? "Entire ad account" : "Specific campaign"}
                                                     </button>
                                                 ))}
                                             </div>

                                            {fbSpendMode === "campaign" && (
                                                 <div className="space-y-2 rounded-lg border bg-gray-50 p-3">
                                                     {fbLoadingCampaigns ? (
                                                         <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Memuat campaign...</div>
                                                     ) : (
                                                         <>
                                                             <Input
                                                                 value={fbCampaignSearch}
                                                                 onChange={e => setFbCampaignSearch(e.target.value)}
                                                                 placeholder="Cari nama campaign..."
                                                                 className="h-10 bg-white"
                                                             />
                                                             <select
                                                                 value={fbSelectedCampaign}
                                                                 onChange={e => { setFbSelectedCampaign(e.target.value); setFbSpendSuccess(false); setFbError(null) }}
                                                                 className="w-full h-11 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                             >
                                                                 <option value="">Pilih campaign...</option>
                                                                 {fbCampaigns
                                                                     .filter(c => `${c.name} ${c.id}`.toLowerCase().includes(fbCampaignSearch.toLowerCase()))
                                                                     .map(c => (
                                                                         <option key={c.id} value={c.id}>{c.name || "(Tanpa nama)"} ({c.id})</option>
                                                                     ))}
                                                             </select>
                                                             {!fbCampaigns.length && <p className="text-xs text-gray-500">Tidak ditemukan campaign untuk akun ini.</p>}
                                                         </>
                                                     )}
                                                 </div>
                                             )}

                                            {fbSpendSuccess && (
                                                <div className="rounded-lg bg-green-50 p-3 flex items-center gap-2">
                                                    <Check className="h-4 w-4 text-green-600" />
                                                    <p className="text-sm text-green-700">
                                                        Berhasil mengambil data spend dari Facebook
                                                    </p>
                                                </div>
                                            )}

                                            {fbError && !fbError.includes('kedaluwarsa') && (
                                                <div className="rounded-lg bg-yellow-50 p-3">
                                                    <p className="text-sm text-yellow-700">{fbError}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {fbAdAccounts.length === 0 && !fbError && (
                                        <div className="rounded-lg bg-gray-50 p-3">
                                            <p className="text-sm text-gray-500">
                                                Tidak ditemukan akun iklan Facebook. Silakan masukkan Ad Spend secara manual.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Metrics Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Metrik Performa{dateOption === "range" && rangeDaysCount ? ` (Total ${rangeDaysCount} Hari)` : ""}
                                </h3>

                                {/* Range info note */}
                                {dateOption === "range" && rangeDaysCount && (
                                    <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
                                        <p className="text-xs text-violet-700 leading-relaxed">
                                            💡 Masukkan total metrik untuk semua hari. Sistem akan membagi rata ke setiap hari
                                            ({rangeDaysCount} laporan terpisah).
                                        </p>
                                    </div>
                                )}

                                {/* Spend Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="spend" className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-blue-500" />
                                        Ad Spend (IDR) {dateOption === "range" ? "— Total" : "*"}
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
                                    {/* Leads Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="leads" className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-violet-500" />
                                            Leads {dateOption === "range" ? "(Total)" : "*"}
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
                                            Closing {dateOption === "range" ? "(Total)" : "*"}
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
                                    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Total + Pajak</p>
                                            <p className="break-words text-base font-bold leading-tight text-blue-600 sm:text-lg">
                                                {spendWithTax > 0
                                                    ? `Rp ${formatCurrency(spendWithTax.toString())}`
                                                    : '-'
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">CPR</p>
                                            <p className="break-words text-base font-bold leading-tight text-violet-600 sm:text-lg">
                                                {spendWithTax > 0 && salesNum > 0
                                                    ? `Rp ${formatCurrency(Math.round(spendWithTax / salesNum).toString())}`
                                                    : '-'
                                                }
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-sm text-gray-500">Conv. Rate</p>
                                            <p className="text-base font-bold leading-tight text-emerald-500 sm:text-lg">
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
                                    <p className="text-sm text-green-600">{successMsg}</p>
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
                                ) : dateOption === "range" && rangeDaysCount ? (
                                    `Simpan ${rangeDaysCount} Laporan`
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
