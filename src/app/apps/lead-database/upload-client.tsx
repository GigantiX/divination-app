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
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15">
                                <Upload className="h-4 w-4 text-success" />
                            </div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Upload Kontak
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Upload kontak peserta event ke database lead.
                        </p>
                    </div>
                    <Link href="/apps/lead-database/history" passHref>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto flex items-center gap-2 border-success/30 bg-success/15 text-success hover:bg-success/20 hover:text-success"
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
                                    ? "bg-success text-success-foreground shadow-sm"
                                    : "bg-card text-muted-foreground border border-border hover:bg-accent"
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <Card className="mb-4 border-border shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        {/* Contact Picker Tab */}
                        {activeTab === "contact" && (
                            <div>
                                {contactPickerSupported ? (
                                    <div className="flex flex-col items-center py-8">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                                            <ContactRound className="h-8 w-8 text-success" />
                                        </div>
                                        <p className="mb-4 text-center text-sm text-muted-foreground">
                                            Pilih kontak langsung dari perangkat Anda
                                        </p>
                                        <Button
                                            className="bg-success hover:bg-success/85 text-success-foreground flex items-center gap-2"
                                            onClick={handleContactPicker}
                                        >
                                            <ContactRound className="h-4 w-4" />
                                            Pilih dari Kontak HP
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-8">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                            <ContactRound className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <p className="text-center text-sm text-muted-foreground">
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
                                            ? "border-destructive/30 bg-destructive/15"
                                            : "border-border bg-muted hover:border-success/30 hover:bg-success/20"
                                    )}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div
                                        className={cn(
                                            "mb-3 flex h-12 w-12 items-center justify-center rounded-full",
                                            fileError ? "bg-destructive/15" : "bg-success/15"
                                        )}
                                    >
                                        <FileUp
                                            className={cn(
                                                "h-6 w-6",
                                                fileError
                                                    ? "text-destructive"
                                                    : "text-success"
                                            )}
                                        />
                                    </div>
                                    <p className="mb-1 text-sm font-medium text-foreground">
                                        {fileName
                                            ? fileName
                                            : "Klik atau seret file ke sini"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
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
                                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
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
                                                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-success/30 focus:outline-none focus:ring-1 focus:ring-success"
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
                                                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-success/30 focus:outline-none focus:ring-1 focus:ring-success"
                                            />
                                            <button
                                                onClick={() => removeManualRow(i)}
                                                disabled={manualRows.length <= 1}
                                                className={cn(
                                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                                                    manualRows.length <= 1
                                                        ? "text-muted-foreground cursor-not-allowed"
                                                        : "text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
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
                                        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-success/30 hover:text-success transition-colors"
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
                                        className="bg-success hover:bg-success/85 text-success-foreground flex items-center gap-2"
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
                <Card className="mb-4 border-border shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Daftar Kontak
                                </h3>
                                <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                                    {contacts.length}
                                </span>
                            </div>
                            {contacts.length > 0 && (
                                <button
                                    onClick={clearAllContacts}
                                    className="flex items-center gap-1 text-xs text-destructive hover:text-destructive transition-colors"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Hapus Semua
                                </button>
                            )}
                        </div>

                        {contacts.length === 0 ? (
                            <div className="flex flex-col items-center py-6 text-center">
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Belum ada kontak. Gunakan salah satu metode di atas
                                    untuk menambahkan kontak.
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {contacts.map((c, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent group"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {c.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {c.phone}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeContact(i)}
                                            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive transition-all"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {contacts.length > 0 && (
                            <p className="mt-3 text-center text-xs text-muted-foreground">
                                {contacts.length} kontak siap diupload
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Event & Batch Selection */}
                <Card className="mb-4 border-border shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        <h3 className="mb-3 text-sm font-semibold text-foreground">
                            Pilih Event & Batch
                        </h3>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Event
                                </label>
                                <select
                                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-success/30 focus:outline-none focus:ring-1 focus:ring-success"
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
                                <label className="text-xs font-medium text-muted-foreground">
                                    Batch
                                </label>
                                <div className="relative">
                                    <select
                                        className={cn(
                                            "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-success/30 focus:outline-none focus:ring-1 focus:ring-success",
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
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Error */}
                {submitError && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{submitError}</span>
                    </div>
                )}

                {/* Submit Button */}
                <Button
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground flex items-center justify-center gap-2 h-12 text-base font-semibold"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
                    <Card className="w-full max-w-sm border-none shadow-xl">
                        <CardContent className="p-0">
                            <div className="p-6 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                                    <CheckCircle2 className="h-7 w-7 text-success" />
                                </div>
                                <h3 className="mb-1 text-lg font-bold text-foreground">
                                    Upload Selesai!
                                </h3>
                                <p className="mb-5 text-sm text-muted-foreground">
                                    Berikut ringkasan hasil upload
                                </p>

                                <div className="space-y-3 text-left">
                                    <div className="flex items-center gap-3 rounded-lg bg-success/15 px-4 py-3">
                                        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-success">
                                                {uploadResult.new_leads} kontak baru
                                                ditambahkan
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-lg bg-primary/15 px-4 py-3">
                                        <RefreshCw className="h-5 w-5 text-primary shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-primary">
                                                {uploadResult.existing_leads} kontak
                                                sudah ada (data event ditambahkan)
                                            </p>
                                        </div>
                                    </div>
                                    {uploadResult.failed > 0 && (
                                        <div className="flex items-start gap-3 rounded-lg bg-destructive/15 px-4 py-3">
                                            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-destructive">
                                                    {uploadResult.failed} kontak gagal
                                                    (nomor tidak valid)
                                                </p>
                                                {uploadResult.failed_numbers.length >
                                                    0 && (
                                                    <p className="mt-1 text-xs text-destructive">
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
                                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
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
