"use client"

import * as React from "react"
import Link from "next/link"
import {
    Upload,
    FileUp,
    UserPlus,
    ContactRound,
    X,
    Loader2,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    History,
} from "lucide-react"

import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type UserProfile } from "@/app/actions/profile"
import { cn } from "@/lib/utils"
import {
    getEventsForLeadUpload,
    getBatchesForEvent,
    uploadContacts,
    type ContactInput,
    type UploadResult,
} from "@/app/actions/lead-database"

// --- Contact Picker API type declaration ---
declare global {
    interface Navigator {
        contacts?: {
            select: (
                props: string[],
                opts?: { multiple?: boolean }
            ) => Promise<{ name?: string[]; tel?: string[] }[]>
        }
    }
}

// --- Helpers ---

function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[^0-9+]/g, "")
    if (cleaned.startsWith("+62")) {
        cleaned = "62" + cleaned.slice(3)
    } else if (cleaned.startsWith("0")) {
        cleaned = "62" + cleaned.slice(1)
    }
    // Remove any remaining non-digit chars (like stray +)
    cleaned = cleaned.replace(/[^0-9]/g, "")
    return cleaned
}

function parseVCF(content: string): ContactInput[] {
    const contacts: ContactInput[] = []
    const vcardBlocks = content.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi)
    if (!vcardBlocks) return contacts

    for (const block of vcardBlocks) {
        let name = ""
        let phone = ""

        const fnMatch = block.match(/FN[;:](.+)/i)
        if (fnMatch) {
            name = fnMatch[1].trim()
        }

        const telMatch = block.match(/TEL[^:]*:(.+)/i)
        if (telMatch) {
            phone = telMatch[1].trim()
        }

        if (name || phone) {
            contacts.push({
                name: name || "Tanpa Nama",
                phone: normalizePhone(phone),
            })
        }
    }
    return contacts
}

function parseCSV(content: string): ContactInput[] {
    const contacts: ContactInput[] = []
    const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    if (lines.length < 2) return contacts

    // Detect separator
    const headerLine = lines[0]
    const separator = headerLine.includes(";") ? ";" : ","
    const headers = headerLine.split(separator).map((h) => h.trim().toLowerCase())

    // Find name column
    const nameIdx = headers.findIndex(
        (h) =>
            h === "name" ||
            h === "nama" ||
            h === "full_name" ||
            h === "fullname" ||
            h === "full name"
    )

    // Find phone column
    const phoneIdx = headers.findIndex(
        (h) =>
            h === "phone" ||
            h === "telepon" ||
            h === "nomor" ||
            h === "no_hp" ||
            h === "nohp" ||
            h === "no hp" ||
            h === "handphone" ||
            h === "hp" ||
            h === "tel" ||
            h === "telephone" ||
            h === "no_telepon" ||
            h === "nomor_telepon" ||
            h === "nomor telepon" ||
            h === "phone_number"
    )

    if (nameIdx === -1 || phoneIdx === -1) return contacts

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map((c) => c.trim())
        const name = cols[nameIdx] || ""
        const phone = cols[phoneIdx] || ""

        if (name || phone) {
            contacts.push({
                name: name || "Tanpa Nama",
                phone: normalizePhone(phone),
            })
        }
    }
    return contacts
}

// --- Tab types ---
type TabType = "contact" | "file" | "manual"

// --- Component ---

export function UploadClient({ profile }: { profile: UserProfile }) {
    const isAdmin = profile.role === "admin" || profile.role === "developer"

    // Tab state
    const [activeTab, setActiveTab] = React.useState<TabType>("file")

    // Contacts ready for upload
    const [contacts, setContacts] = React.useState<ContactInput[]>([])

    // Contact Picker
    const [contactPickerSupported, setContactPickerSupported] = React.useState(false)

    // File upload
    const [fileError, setFileError] = React.useState("")
    const [fileName, setFileName] = React.useState("")
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Manual entry
    const [manualRows, setManualRows] = React.useState<ContactInput[]>([
        { name: "", phone: "" },
    ])

    // Event & Batch
    const [events, setEvents] = React.useState<{ id: string; name: string }[]>([])
    const [batches, setBatches] = React.useState<{ id: string; name: string }[]>([])
    const [selectedEventId, setSelectedEventId] = React.useState("")
    const [selectedBatchId, setSelectedBatchId] = React.useState("")
    const [loadingBatches, setLoadingBatches] = React.useState(false)

    // Submit
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [uploadResult, setUploadResult] = React.useState<UploadResult | null>(null)
    const [submitError, setSubmitError] = React.useState("")

    // Check contact picker support
    React.useEffect(() => {
        if (typeof navigator !== "undefined" && navigator.contacts) {
            setContactPickerSupported(true)
        }
    }, [])

    // Load events
    React.useEffect(() => {
        async function loadEvents() {
            const res = await getEventsForLeadUpload()
            if (res.data) setEvents(res.data)
        }
        loadEvents()
    }, [])

    // Load batches when event changes
    React.useEffect(() => {
        if (!selectedEventId) {
            setBatches([])
            setSelectedBatchId("")
            return
        }
        async function loadBatches() {
            setLoadingBatches(true)
            const res = await getBatchesForEvent(selectedEventId)
            if (res.data) setBatches(res.data)
            setSelectedBatchId("")
            setLoadingBatches(false)
        }
        loadBatches()
    }, [selectedEventId])

    // --- Contact Picker ---
    const handleContactPicker = async () => {
        if (!navigator.contacts) return
        try {
            const results = await navigator.contacts.select(["name", "tel"], {
                multiple: true,
            })
            const parsed: ContactInput[] = results
                .map((c) => ({
                    name: c.name?.[0] || "Tanpa Nama",
                    phone: normalizePhone(c.tel?.[0] || ""),
                }))
                .filter((c) => c.phone)

            setContacts((prev) => [...prev, ...parsed])
        } catch {
            // User cancelled or error
        }
    }

    // --- File Upload ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError("")
        setFileName("")
        const file = e.target.files?.[0]
        if (!file) return

        const ext = file.name.split(".").pop()?.toLowerCase()
        if (ext !== "vcf" && ext !== "csv") {
            setFileError("Format file tidak didukung. Gunakan file .vcf atau .csv")
            return
        }

        setFileName(file.name)
        const reader = new FileReader()
        reader.onload = (ev) => {
            const content = ev.target?.result as string
            let parsed: ContactInput[] = []

            if (ext === "vcf") {
                parsed = parseVCF(content)
            } else if (ext === "csv") {
                parsed = parseCSV(content)
            }

            if (parsed.length === 0) {
                setFileError(
                    "Tidak ada kontak yang berhasil dibaca dari file. Pastikan format file sesuai."
                )
                return
            }

            setContacts((prev) => [...prev, ...parsed])
        }
        reader.readAsText(file)
    }

    // --- Manual Entry ---
    const addManualRow = () => {
        setManualRows((prev) => [...prev, { name: "", phone: "" }])
    }

    const removeManualRow = (index: number) => {
        setManualRows((prev) => prev.filter((_, i) => i !== index))
    }

    const updateManualRow = (
        index: number,
        field: "name" | "phone",
        value: string
    ) => {
        setManualRows((prev) =>
            prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
        )
    }

    const addManualContactsToList = () => {
        const valid = manualRows.filter((r) => r.name.trim() || r.phone.trim())
        if (valid.length === 0) return

        const normalized = valid.map((r) => ({
            name: r.name.trim() || "Tanpa Nama",
            phone: normalizePhone(r.phone),
        }))

        setContacts((prev) => [...prev, ...normalized])
        setManualRows([{ name: "", phone: "" }])
    }

    // --- Contact List Management ---
    const removeContact = (index: number) => {
        setContacts((prev) => prev.filter((_, i) => i !== index))
    }

    const clearAllContacts = () => {
        setContacts([])
    }

    // --- Submit ---
    const handleSubmit = async () => {
        setSubmitError("")
        if (contacts.length === 0) return
        if (!selectedEventId || !selectedBatchId) return

        setIsSubmitting(true)
        const res = await uploadContacts(contacts, selectedEventId, selectedBatchId)

        if (res.error) {
            setSubmitError(res.error)
            setIsSubmitting(false)
            return
        }

        if (res.data) {
            setUploadResult(res.data)
        }
        setIsSubmitting(false)
    }

    // --- Reset after success ---
    const handleDone = () => {
        setUploadResult(null)
        setContacts([])
        setSelectedEventId("")
        setSelectedBatchId("")
        setBatches([])
        setManualRows([{ name: "", phone: "" }])
        setFileName("")
        setFileError("")
        setSubmitError("")
    }

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        {
            key: "contact",
            label: "Dari Kontak",
            icon: <ContactRound className="h-4 w-4" />,
        },
        {
            key: "file",
            label: "Upload File",
            icon: <FileUp className="h-4 w-4" />,
        },
        {
            key: "manual",
            label: "Input Manual",
            icon: <UserPlus className="h-4 w-4" />,
        },
    ]

    return (
        <NavigationLayout isAdmin={isAdmin}>
            <div className="flex-1 p-4 pb-24 md:mx-auto md:w-full md:max-w-4xl md:p-6">
                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                                <Upload className="h-4 w-4 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Upload Kontak
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            Upload kontak peserta event ke database lead.
                        </p>
                    </div>
                    <Link href="/apps/lead-database/history" passHref>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto flex items-center gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        >
                            <History className="h-4 w-4" />
                            Riwayat Upload
                        </Button>
                    </Link>
                </div>

                {/* Tab Buttons */}
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                                activeTab === tab.key
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <Card className="mb-4 border-gray-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        {/* Contact Picker Tab */}
                        {activeTab === "contact" && (
                            <div>
                                {contactPickerSupported ? (
                                    <div className="flex flex-col items-center py-8">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                                            <ContactRound className="h-8 w-8 text-emerald-600" />
                                        </div>
                                        <p className="mb-4 text-center text-sm text-gray-500">
                                            Pilih kontak langsung dari perangkat Anda
                                        </p>
                                        <Button
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                                            onClick={handleContactPicker}
                                        >
                                            <ContactRound className="h-4 w-4" />
                                            Pilih dari Kontak HP
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-8">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                            <ContactRound className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <p className="text-center text-sm text-gray-500">
                                            Fitur ini hanya tersedia di Android Chrome.
                                            <br />
                                            Gunakan metode lain untuk menambahkan kontak.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* File Upload Tab */}
                        {activeTab === "file" && (
                            <div>
                                <div
                                    className={cn(
                                        "flex flex-col items-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
                                        fileError
                                            ? "border-red-300 bg-red-50"
                                            : "border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50"
                                    )}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div
                                        className={cn(
                                            "mb-3 flex h-12 w-12 items-center justify-center rounded-full",
                                            fileError ? "bg-red-100" : "bg-emerald-100"
                                        )}
                                    >
                                        <FileUp
                                            className={cn(
                                                "h-6 w-6",
                                                fileError
                                                    ? "text-red-500"
                                                    : "text-emerald-600"
                                            )}
                                        />
                                    </div>
                                    <p className="mb-1 text-sm font-medium text-gray-700">
                                        {fileName
                                            ? fileName
                                            : "Klik atau seret file ke sini"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Format: .vcf (vCard) atau .csv
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".vcf,.csv"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </div>
                                {fileError && (
                                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>{fileError}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Manual Entry Tab */}
                        {activeTab === "manual" && (
                            <div>
                                <div className="space-y-3">
                                    {manualRows.map((row, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2"
                                        >
                                            <input
                                                type="text"
                                                placeholder="Nama"
                                                value={row.name}
                                                onChange={(e) =>
                                                    updateManualRow(
                                                        i,
                                                        "name",
                                                        e.target.value
                                                    )
                                                }
                                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                            <input
                                                type="tel"
                                                placeholder="No. HP"
                                                value={row.phone}
                                                onChange={(e) =>
                                                    updateManualRow(
                                                        i,
                                                        "phone",
                                                        e.target.value
                                                    )
                                                }
                                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                            <button
                                                onClick={() => removeManualRow(i)}
                                                disabled={manualRows.length <= 1}
                                                className={cn(
                                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                                                    manualRows.length <= 1
                                                        ? "text-gray-300 cursor-not-allowed"
                                                        : "text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                )}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                    <button
                                        onClick={addManualRow}
                                        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Tambah Kontak
                                    </button>
                                    <Button
                                        onClick={addManualContactsToList}
                                        disabled={
                                            !manualRows.some(
                                                (r) =>
                                                    r.name.trim() || r.phone.trim()
                                            )
                                        }
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                                        size="sm"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Tambahkan ke Daftar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Contact Preview Section */}
                <Card className="mb-4 border-gray-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Daftar Kontak
                                </h3>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                    {contacts.length}
                                </span>
                            </div>
                            {contacts.length > 0 && (
                                <button
                                    onClick={clearAllContacts}
                                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Hapus Semua
                                </button>
                            )}
                        </div>

                        {contacts.length === 0 ? (
                            <div className="flex flex-col items-center py-6 text-center">
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                                    <UserPlus className="h-5 w-5 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500">
                                    Belum ada kontak. Gunakan salah satu metode di atas
                                    untuk menambahkan kontak.
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {contacts.map((c, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 group"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {c.name}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {c.phone}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeContact(i)}
                                            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {contacts.length > 0 && (
                            <p className="mt-3 text-center text-xs text-gray-500">
                                {contacts.length} kontak siap diupload
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Event & Batch Selection */}
                <Card className="mb-4 border-gray-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">
                            Pilih Event & Batch
                        </h3>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600">
                                    Event
                                </label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    value={selectedEventId}
                                    onChange={(e) =>
                                        setSelectedEventId(e.target.value)
                                    }
                                >
                                    <option value="" disabled>
                                        Pilih Event...
                                    </option>
                                    {events.map((ev) => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600">
                                    Batch
                                </label>
                                <div className="relative">
                                    <select
                                        className={cn(
                                            "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
                                            !selectedEventId &&
                                                "opacity-50 cursor-not-allowed"
                                        )}
                                        value={selectedBatchId}
                                        onChange={(e) =>
                                            setSelectedBatchId(e.target.value)
                                        }
                                        disabled={!selectedEventId || loadingBatches}
                                    >
                                        <option value="" disabled>
                                            {loadingBatches
                                                ? "Memuat batch..."
                                                : "Pilih Batch..."}
                                        </option>
                                        {batches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    {loadingBatches && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Error */}
                {submitError && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{submitError}</span>
                    </div>
                )}

                {/* Submit Button */}
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 h-12 text-base font-semibold"
                    disabled={
                        contacts.length === 0 ||
                        !selectedEventId ||
                        !selectedBatchId ||
                        isSubmitting
                    }
                    onClick={handleSubmit}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Mengupload...
                        </>
                    ) : (
                        <>
                            <Upload className="h-5 w-5" />
                            Upload Kontak
                        </>
                    )}
                </Button>
            </div>

            {/* Result Modal */}
            {uploadResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-sm border-none shadow-xl">
                        <CardContent className="p-0">
                            <div className="p-6 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                                </div>
                                <h3 className="mb-1 text-lg font-bold text-gray-900">
                                    Upload Selesai!
                                </h3>
                                <p className="mb-5 text-sm text-gray-500">
                                    Berikut ringkasan hasil upload
                                </p>

                                <div className="space-y-3 text-left">
                                    <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-800">
                                                {uploadResult.new_leads} kontak baru
                                                ditambahkan
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3">
                                        <RefreshCw className="h-5 w-5 text-blue-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-blue-800">
                                                {uploadResult.existing_leads} kontak
                                                sudah ada (data event ditambahkan)
                                            </p>
                                        </div>
                                    </div>
                                    {uploadResult.failed > 0 && (
                                        <div className="flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3">
                                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-red-800">
                                                    {uploadResult.failed} kontak gagal
                                                    (nomor tidak valid)
                                                </p>
                                                {uploadResult.failed_numbers.length >
                                                    0 && (
                                                    <p className="mt-1 text-xs text-red-600">
                                                        {uploadResult.failed_numbers.join(
                                                            ", "
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="border-t p-4">
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={handleDone}
                                >
                                    Selesai
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </NavigationLayout>
    )
}
