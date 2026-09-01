"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Calendar, Check, ChevronLeft, ChevronDown, Facebook, FileText, Info, Loader2, Percent, RefreshCw, Search, ShoppingCart, Users } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createReport, createReportRange } from "@/app/actions/reports"
import { getBatch } from "@/app/actions/batches"
import { getEvent } from "@/app/actions/events"
import { getFacebookAdAccounts, getFacebookAdsSpend, getFacebookCampaigns } from "@/app/actions/facebook-ads"
import type { FacebookAdAccount, FacebookCampaign } from "@/app/actions/facebook-ads"
import { cn } from "@/lib/utils"

type DateOption = "today" | "yesterday" | "custom" | "range"
type SpendMode = "account" | "campaign"

const getJakartaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
const shiftDate = (date: string, days: number) => { const [y, m, d] = date.split("-").map(Number); const next = new Date(Date.UTC(y, m - 1, d)); next.setUTCDate(next.getUTCDate() + days); return next.toISOString().split("T")[0] }
const strToDate = (value: string) => { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d) }
const dateToStr = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
const formatCurrency = (value: string) => { const digits = value.replace(/\D/g, ""); return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") }
const parseCurrency = (value: string) => parseInt(value.replace(/\./g, "") || "0", 10)

function StepHeading({ number, eyebrow, title, description }: { number: string; eyebrow: string; title: string; description: string }) {
    return <div className="mb-5 flex gap-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{number}</div><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{title}</h2><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{description}</p></div></div>
}

export default function NewReportPage() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const eventId = params.id as string
    const batchId = searchParams.get("batch") || ""
    const today = getJakartaDate()
    const yesterday = shiftDate(today, -1)
    const todayObject = strToDate(today)

    const [batchName, setBatchName] = React.useState<string | null>(null)
    const [event, setEvent] = React.useState<{ name: string; logo_url?: string | null } | null>(null)
    const [dateOption, setDateOption] = React.useState<DateOption>("today")
    const [customDate, setCustomDate] = React.useState<Date | undefined>(todayObject)
    const [rangeDate, setRangeDate] = React.useState<DateRange | undefined>()
    const [formData, setFormData] = React.useState({ spend: "", leads: "", sales: "", notes: "" })
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState(false)
    const [successMsg, setSuccessMsg] = React.useState("")
    const [fbAccounts, setFbAccounts] = React.useState<FacebookAdAccount[]>([])
    const [fbAccount, setFbAccount] = React.useState("")
    const [spendMode, setSpendMode] = React.useState<SpendMode>("account")
    const [campaigns, setCampaigns] = React.useState<FacebookCampaign[]>([])
    const [campaign, setCampaign] = React.useState("")
    const [campaignSearch, setCampaignSearch] = React.useState("")
    const [campaignsFor, setCampaignsFor] = React.useState("")
    const [loadingAccounts, setLoadingAccounts] = React.useState(true)
    const [loadingCampaigns, setLoadingCampaigns] = React.useState(false)
    const [fetchingSpend, setFetchingSpend] = React.useState(false)
    const [fbError, setFbError] = React.useState<string | null>(null)
    const [spendFetched, setSpendFetched] = React.useState(false)
    const [taxOption, setTaxOption] = React.useState<"4" | "11" | "custom">("11")
    const [customTax, setCustomTax] = React.useState("")

    React.useEffect(() => { if (batchId) getBatch(batchId).then(batch => batch && setBatchName(batch.name)) }, [batchId])
    React.useEffect(() => { getEvent(eventId).then(setEvent) }, [eventId])
    React.useEffect(() => { getFacebookAdAccounts().then(result => { setLoadingAccounts(false); if (result.success) setFbAccounts(result.adAccounts || []); else if (result.tokenExpired) setFbError(result.error || "Token Facebook telah kedaluwarsa") }) }, [])

    const singleDate = () => dateOption === "today" ? today : dateOption === "yesterday" ? yesterday : dateOption === "custom" && customDate ? dateToStr(customDate) : today
    const fbDates = () => dateOption === "range" && rangeDate?.from ? { date: dateToStr(rangeDate.from), endDate: rangeDate.to ? dateToStr(rangeDate.to) : undefined } : { date: singleDate(), endDate: undefined }
    const tax = taxOption === "custom" ? Math.min(100, Math.max(0, parseFloat(customTax) || 0)) : parseInt(taxOption)
    const spend = parseCurrency(formData.spend)
    const leads = parseInt(formData.leads || "0", 10)
    const sales = parseInt(formData.sales || "0", 10)
    const spendWithTax = Math.round(spend * (1 + tax / 100))
    const rangeDays = rangeDate?.from && rangeDate.to ? Math.round((rangeDate.to.getTime() - rangeDate.from.getTime()) / 86400000) + 1 : null
    const filteredCampaigns = campaigns.filter(item => `${item.name} ${item.id}`.toLowerCase().includes(campaignSearch.toLowerCase()))
    const selectedCampaign = campaigns.find(item => item.id === campaign)

    const chooseDateOption = (option: DateOption) => {
        setDateOption(option)
        setSpendFetched(false)
        setFormData(prev => ({ ...prev, spend: "" }))
        setFbError(null)
    }
    const chooseAccount = (account: string) => { setFbAccount(account); setSpendMode("account"); setCampaigns([]); setCampaign(""); setCampaignSearch(""); setCampaignsFor(""); setSpendFetched(false); setFormData(prev => ({ ...prev, spend: "" })); setFbError(null) }
    const chooseMode = async (mode: SpendMode) => {
        setSpendMode(mode); setSpendFetched(false); setFbError(null)
        if (mode === "campaign" && campaignsFor !== fbAccount) { setLoadingCampaigns(true); const result = await getFacebookCampaigns(fbAccount); setLoadingCampaigns(false); if (result.success) { setCampaigns(result.campaigns || []); setCampaignsFor(fbAccount) } else setFbError(result.error || "Gagal mengambil data campaign") }
    }
    const fetchSpend = async () => {
        if (!fbAccount || (spendMode === "campaign" && !campaign)) { setFbError("Pilih campaign terlebih dahulu"); return }
        setFetchingSpend(true); setFbError(null); setSpendFetched(false)
        const { date, endDate } = fbDates()
        const result = await getFacebookAdsSpend(fbAccount, date, endDate, spendMode === "campaign" ? campaign : undefined)
        if (result.success && result.spend !== undefined) { const fetchedSpend = result.spend; setFormData(prev => ({ ...prev, spend: formatCurrency(Math.round(fetchedSpend).toString()) })); setSpendFetched(true) } else setFbError(result.error || "Gagal mengambil data spend")
        setFetchingSpend(false)
    }
    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData(prev => ({ ...prev, [event.target.name]: event.target.value })); setError(null); setSpendFetched(event.target.name === "spend" ? false : spendFetched) }
    const submit = async (event: React.FormEvent) => {
        event.preventDefault(); setIsLoading(true); setError(null)
        if (!batchId) { setError("Batch tidak ditemukan. Silakan kembali dan pilih batch."); setIsLoading(false); return }
        if (sales > leads) { setError("Jumlah closing tidak boleh lebih dari leads"); setIsLoading(false); return }
        if (dateOption === "range") {
            if (!rangeDate?.from || !rangeDate.to) { setError("Pilih tanggal mulai dan akhir untuk range laporan"); setIsLoading(false); return }
            const result = await createReportRange({ batchId, startDate: dateToStr(rangeDate.from), endDate: dateToStr(rangeDate.to), totalLeadsCount: leads, totalClosingCount: sales, totalAdsSpent: spend, taxPercentage: tax, notes: formData.notes || undefined })
            if (result.error) setError(result.error); else { setSuccessMsg(`${result.created} laporan berhasil dibuat!`); setSuccess(true); setTimeout(() => { router.push(`/events/${eventId}?batch=${batchId}`); router.refresh() }, 1200) }
        } else {
            const result = await createReport({ batchId, reportDate: singleDate(), leadsCount: leads, closingCount: sales, adsSpent: spend, taxPercentage: tax, notes: formData.notes || undefined })
            if (result.error) setError(result.error); else { setSuccessMsg("Laporan berhasil disimpan!"); setSuccess(true); setTimeout(() => { router.push(`/events/${eventId}?batch=${batchId}`); router.refresh() }, 1000) }
        }
        setIsLoading(false)
    }

    const valid = !!formData.spend && !!formData.leads && !!formData.sales && !!batchId && !success
    return <main className="min-h-screen overflow-x-hidden bg-background-secondary text-foreground"><div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-center justify-between gap-3 sm:mb-8"><div className="flex min-w-0 items-center gap-2 sm:gap-3"><Link href={`/events/${eventId}?batch=${batchId}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-primary"><ChevronLeft className="h-5 w-5" /></Link>{event?.logo_url ? <img src={event.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-primary">{event?.name?.charAt(0).toUpperCase() || "E"}</div>}<div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{event?.name || "Event"}</p><h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Tambah Laporan</h1></div></div><div className="hidden max-w-[220px] truncate rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 sm:block">{batchName || "Laporan baru"}</div></header>
        {!batchId && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Batch tidak ditemukan. Silakan kembali ke halaman event dan pilih batch terlebih dahulu.</div>}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8"><form onSubmit={submit} className="space-y-8 sm:space-y-10">
            <div className="border-b border-slate-100 pb-5 sm:pb-6"><p className="text-sm font-medium text-slate-500">{batchName ? `Batch / ${batchName}` : "Laporan harian"}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Laporan Performa</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Rekam ad spend dan performa dalam satu alur yang mudah diperiksa.</p></div>
            <section><StepHeading number="1" eyebrow="Kapan periodenya?" title="Periode Laporan" description="Pilih hari atau range tanggal yang dicakup laporan ini." /><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["today", "yesterday", "custom", "range"] as DateOption[]).map(mode => <button key={mode} type="button" onClick={() => chooseDateOption(mode)} className={cn("rounded-xl border px-3 py-3 text-sm font-semibold transition", dateOption === mode ? "border-primary bg-primary text-white shadow-md" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200")}>{mode === "today" ? "Hari ini" : mode === "yesterday" ? "Kemarin" : mode === "custom" ? "Pilih tanggal" : "Range tanggal"}</button>)}</div>{dateOption === "custom" && <div className="mt-3"><DatePicker mode="single" selected={customDate} onSelect={date => { setCustomDate(date); setSpendFetched(false); setFormData(prev => ({ ...prev, spend: "" })) }} max={todayObject} placeholder="Pilih tanggal" /></div>}{dateOption === "range" && <div className="mt-3 space-y-2"><DatePicker mode="range" selected={rangeDate} onSelect={range => { setRangeDate(range); setSpendFetched(false); setFormData(prev => ({ ...prev, spend: "" })) }} max={todayObject} placeholder="Pilih tanggal mulai – akhir" />{rangeDays && <p className="text-xs font-medium text-blue-600">{rangeDays} hari dipilih — laporan akan dibuat per hari</p>}</div>}<div className="mt-3 flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700"><Calendar className="h-4 w-4" />{dateOption === "range" && rangeDate?.from && rangeDate.to ? `${format(rangeDate.from, "d MMM yyyy", { locale: idLocale })} – ${format(rangeDate.to, "d MMM yyyy", { locale: idLocale })}` : format(strToDate(singleDate()), "d MMM yyyy", { locale: idLocale })}</div></section>
            <section><StepHeading number="2" eyebrow="Dari mana ad spend?" title="Sumber ad spend" description="Pilih ad account, lalu gunakan totalnya atau satu campaign tertentu." />{loadingAccounts ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Memeriksa koneksi Facebook...</div> : fbAccounts.length === 0 ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Tidak ditemukan ad account Facebook. Silakan masukkan Ad Spend secara manual.</div> : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5"><div className="mb-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><Facebook className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Meta Ads</p><p className="text-xs text-slate-500">Terhubung · siap mengambil data</p></div></div><label className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Ad account</label><div className="relative"><select value={fbAccount} onChange={e => chooseAccount(e.target.value)} className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"><option value="">Pilih ad account...</option>{fbAccounts.map(account => <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div><div className="mt-5"><p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Ruang lingkup spend</p><div className="grid grid-cols-2 gap-2 rounded-xl bg-blue-100/60 p-1">{(["account", "campaign"] as SpendMode[]).map(mode => <button key={mode} type="button" disabled={mode === "campaign" && !fbAccount} onClick={() => chooseMode(mode)} className={cn("rounded-lg px-2 py-2.5 text-xs font-semibold transition sm:px-3 sm:text-sm", spendMode === mode ? "bg-white text-primary shadow-sm" : "text-slate-600 disabled:cursor-not-allowed disabled:opacity-50")}>{mode === "account" ? "Entire ad account" : "Campaign tertentu"}</button>)}</div></div>{spendMode === "campaign" && <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">{loadingCampaigns ? <div className="flex items-center gap-2 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Memuat campaign...</div> : <><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={campaignSearch} onChange={e => setCampaignSearch(e.target.value)} placeholder="Cari nama campaign atau ID" className="h-11 pl-10" /></div><p className="mt-3 px-1 text-xs text-slate-500">{filteredCampaigns.length} campaign · pencarian lokal</p><div className="mt-2 max-h-48 space-y-1 overflow-y-auto">{filteredCampaigns.map(item => <button type="button" key={item.id} onClick={() => { setCampaign(item.id); setSpendFetched(false) }} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left", campaign === item.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50")}><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-700">{item.name || "(Tanpa nama)"}</span><span className="block text-[11px] text-slate-400">ID: {item.id}</span></span><span className={cn("ml-3 shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", item.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>{item.status || "Unknown"}</span></button>)}</div>{!filteredCampaigns.length && <p className="py-3 text-sm text-slate-500">Tidak ditemukan campaign.</p>}</>}</div>}<div className="mt-4 flex flex-col items-stretch gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Sumber terpilih</p><p className="mt-1 truncate text-sm font-semibold">{spendMode === "campaign" ? selectedCampaign?.name || "Pilih campaign" : "Entire ad account"}</p>{selectedCampaign && spendMode === "campaign" && <p className="text-[11px] text-slate-400">Campaign ID: {selectedCampaign.id}</p>}</div><Button type="button" onClick={fetchSpend} disabled={!fbAccount || fetchingSpend || (spendMode === "campaign" && !campaign)} className="h-11 w-full shrink-0 sm:w-auto">{fetchingSpend ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ambil ad spend"}</Button></div>{spendFetched && <div className="mt-3 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"><Check className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Spend berhasil diambil.</strong> Rp {formData.spend} · {dateOption === "range" ? "range terpilih" : format(strToDate(singleDate()), "d MMM yyyy", { locale: idLocale })}</span></div>}{fbError && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{fbError}{fbError.includes("kedaluwarsa") && <Link href="/settings" className="ml-2 font-semibold underline"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />Hubungkan ulang</Link>}</div>}</div>}</section>
            <section><StepHeading number="3" eyebrow="Apa hasilnya?" title="Metrik Performa" description="Isi angka hasil performa. Ad spend tetap bisa diedit untuk koreksi." /><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Ad spend <span className="normal-case tracking-normal text-green-600">{spendFetched ? "Dari Facebook · bisa diedit" : "Input manual"}</span></span><div className="flex h-14 items-center rounded-xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-blue-100"><span className="mr-2 text-sm font-semibold text-slate-400">Rp</span><input name="spend" value={formData.spend} onChange={e => { const value = formatCurrency(e.target.value); setFormData(prev => ({ ...prev, spend: value })); setSpendFetched(false) }} className="w-full bg-transparent text-lg font-semibold outline-none" required /></div></label><label><span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-500"><Users className="h-4 w-4 text-blue-500" />Leads</span><input name="leads" type="number" min="0" value={formData.leads} onChange={handleChange} className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-lg font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" required /></label><label><span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-500"><ShoppingCart className="h-4 w-4 text-blue-500" />Closing</span><input name="sales" type="number" min="0" max={formData.leads || undefined} value={formData.sales} onChange={handleChange} className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-lg font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" required /></label></div><div className="mt-5 flex items-start gap-3 rounded-xl bg-blue-50 p-4"><Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><div className="text-sm text-blue-800"><p className="font-semibold">Pajak Meta Ads · {tax}%</p><p className="mt-1 break-words">Ditambahkan ke ad spend: Rp {formData.spend || "0"} + {tax}% = <strong>Rp {formatCurrency(spendWithTax.toString())}</strong></p></div></div><div className="mt-4 flex gap-2">{(["4", "11", "custom"] as const).map(option => <button key={option} type="button" onClick={() => setTaxOption(option)} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-semibold", taxOption === option ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{option === "custom" ? "Custom" : `${option}%`}</button>)}</div>{taxOption === "custom" && <Input type="number" min="0" max="100" step="0.1" placeholder="Masukkan persentase pajak" value={customTax} onChange={e => setCustomTax(e.target.value)} className="mt-3" />}</section>
            <section><StepHeading number="4" eyebrow="Sebelum disimpan" title="Ringkasan" description="Cek cepat angka pada laporan ini sebelum menyimpan." /><div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="p-4 text-center"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total biaya</p><p className="mt-2 text-base font-bold text-slate-900 sm:text-xl">Rp {formatCurrency(spendWithTax.toString())}</p></div><div className="p-4 text-center"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">CPR</p><p className="mt-2 text-base font-bold text-slate-900 sm:text-xl">{sales ? `Rp ${formatCurrency(Math.round(spendWithTax / sales).toString())}` : "-"}</p></div><div className="p-4 text-center"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Conv. rate</p><p className="mt-2 text-base font-bold text-slate-900 sm:text-xl">{leads ? `${((sales / leads) * 100).toFixed(1)}%` : "-"}</p></div></div></section>
            <section><label htmlFor="notes" className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-slate-500" />Catatan <span className="font-normal text-slate-400">Opsional</span></label><Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Tambahkan catatan tentang performa..." className="min-h-24 resize-none" maxLength={500} /></section>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}{success && <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"><Check className="h-4 w-4" />{successMsg}</div>}<Button type="submit" disabled={!valid || isLoading} className="h-14 w-full rounded-2xl text-base font-semibold">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : success ? <><Check className="mr-2 h-4 w-4" />Berhasil</> : dateOption === "range" && rangeDays ? `Simpan ${rangeDays} Laporan` : "Simpan Laporan"}</Button>
        </form></section><aside className="hidden space-y-4 lg:sticky lg:top-8 lg:self-start lg:block"><div className="rounded-3xl bg-primary p-6 text-white shadow-lg"><div className="flex items-center gap-2 text-blue-100"><span className="text-xs font-bold uppercase tracking-[0.18em]">Ringkasan Laporan</span></div><p className="mt-8 text-sm text-blue-100">Tanggal laporan</p><p className="mt-1 text-lg font-semibold">{dateOption === "range" ? "Range terpilih" : format(strToDate(singleDate()), "d MMM yyyy", { locale: idLocale })}</p><div className="my-6 h-px bg-white/20" /><p className="text-sm text-blue-100">Sumber spend</p><p className="mt-1 truncate text-lg font-semibold">{spendMode === "campaign" ? selectedCampaign?.name || "Campaign belum dipilih" : "Entire ad account"}</p><div className="mt-6 rounded-2xl bg-white/15 p-4"><p className="text-xs font-bold uppercase tracking-wider text-blue-100">Total biaya</p><p className="mt-2 text-2xl font-semibold">Rp {formatCurrency(spendWithTax.toString())}</p><p className="mt-1 text-xs text-blue-100">Termasuk pajak Meta {tax}%</p></div></div><div className="rounded-3xl border border-blue-100 bg-white p-5"><p className="text-sm font-semibold text-slate-900">Checklist laporan</p><p className="mt-3 text-sm leading-6 text-slate-500">Pilih periode, pastikan sumber spend, lalu periksa metrik sebelum menyimpan.</p></div></aside></div><p className="mt-6 text-center text-xs text-slate-400">Laporan disimpan ke batch yang sedang aktif</p>
    </div></main>
}
