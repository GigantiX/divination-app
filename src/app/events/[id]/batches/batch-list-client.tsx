"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ArrowUpRight,
    Banknote,
    CalendarDays,
    ChevronLeft,
    Clock3,
    FileText,
    Layers3,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react"

import {
    deleteBatch,
    type BatchListItem,
    type EventBatchListData,
} from "@/app/actions/batches"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { NavigationLayout } from "@/components/ui/nav-layout"
import { cn } from "@/lib/utils"

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
})

function formatDate(value: string) {
    const [year, month, day] = value.split('-').map(Number)
    return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

function formatCreatedAt(value: string) {
    return dateFormatter.format(new Date(value))
}

function formatCurrency(value: number) {
    if (value <= 0) return "Belum diatur"
    return `Rp ${value.toLocaleString('id-ID')}`
}

interface BatchListClientProps {
    data: EventBatchListData
}

export function BatchListClient({ data }: BatchListClientProps) {
    const router = useRouter()
    const [activeBatches, setActiveBatches] = React.useState(data.activeBatches)
    const [completedBatches, setCompletedBatches] = React.useState(data.completedBatches)
    const [openMenuId, setOpenMenuId] = React.useState<string | null>(null)
    const [batchToDelete, setBatchToDelete] = React.useState<BatchListItem | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [deleteError, setDeleteError] = React.useState<string | null>(null)

    const isAdmin = data.userRole === 'admin' || data.userRole === 'developer'
    const hasBatchActions = data.canEditBatch || data.canDeleteBatch
    React.useEffect(() => {
        if (!openMenuId) return

        const closeMenu = (event: MouseEvent) => {
            const target = event.target as Element | null
            if (!target?.closest('[data-batch-menu]')) {
                setOpenMenuId(null)
            }
        }
        const closeMenuOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpenMenuId(null)
        }

        document.addEventListener('mousedown', closeMenu)
        document.addEventListener('keydown', closeMenuOnEscape)
        return () => {
            document.removeEventListener('mousedown', closeMenu)
            document.removeEventListener('keydown', closeMenuOnEscape)
        }
    }, [openMenuId])

    const requestDelete = (batch: BatchListItem) => {
        setOpenMenuId(null)
        setDeleteError(null)
        setBatchToDelete(batch)
    }

    const handleDelete = async () => {
        if (!batchToDelete) return

        setIsDeleting(true)
        setDeleteError(null)
        const result = await deleteBatch(batchToDelete.id)

        if (result.error) {
            setDeleteError(result.error)
            setIsDeleting(false)
            return
        }

        setActiveBatches((batches) => batches.filter((batch) => batch.id !== batchToDelete.id))
        setCompletedBatches((batches) => batches.filter((batch) => batch.id !== batchToDelete.id))
        setBatchToDelete(null)
        setIsDeleting(false)
        router.refresh()
    }

    return (
        <NavigationLayout isAdmin={isAdmin} showBottomNav={false}>
            <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-xl">
                <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
                    <Link href="/dashboard" aria-label="Kembali ke dashboard">
                        <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>

                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-primary/10">
                            {data.event.logoUrl ? (
                                <Image
                                    src={data.event.logoUrl}
                                    alt=""
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                />
                            ) : (
                                <Layers3 className="h-5 w-5 text-primary" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                                {data.event.name}
                            </p>
                            <p className="text-xs text-muted-foreground">Daftar batch</p>
                        </div>
                    </div>

                    {data.canCreateBatch && (
                        <Link href={`/events/${data.event.id}/batches/new`}>
                            <Button className="rounded-xl px-3 sm:px-4">
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Tambah Batch</span>
                                <span className="sr-only sm:hidden">Tambah Batch</span>
                            </Button>
                        </Link>
                    )}
                </div>
            </header>

            <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <div className="space-y-10">
                    <BatchSection
                        title="Batch Aktif"
                        description="Sedang berjalan atau belum melewati tanggal selesai."
                        batches={activeBatches}
                        eventId={data.event.id}
                        status="active"
                        hasBatchActions={hasBatchActions}
                        canEditBatch={data.canEditBatch}
                        canDeleteBatch={data.canDeleteBatch}
                        openMenuId={openMenuId}
                        onMenuToggle={(batchId) => setOpenMenuId((current) => current === batchId ? null : batchId)}
                        onDelete={requestDelete}
                    />

                    <BatchSection
                        title="Selesai"
                        description="Tanggal selesai batch sudah terlewati."
                        batches={completedBatches}
                        eventId={data.event.id}
                        status="completed"
                        hasBatchActions={hasBatchActions}
                        canEditBatch={data.canEditBatch}
                        canDeleteBatch={data.canDeleteBatch}
                        openMenuId={openMenuId}
                        onMenuToggle={(batchId) => setOpenMenuId((current) => current === batchId ? null : batchId)}
                        onDelete={requestDelete}
                    />
                </div>
            </main>

            {batchToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/[0.55] p-4 backdrop-blur-sm">
                    <Card
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-batch-title"
                        aria-describedby="delete-batch-description"
                        className="w-full max-w-md overflow-hidden rounded-2xl border-destructive/25 shadow-2xl"
                    >
                        <div className="flex items-start gap-4 border-b bg-destructive/10 p-6">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/15">
                                <Trash2 className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                                <h2 id="delete-batch-title" className="text-lg font-bold text-foreground">
                                    Hapus batch?
                                </h2>
                                <p id="delete-batch-description" className="mt-1 text-sm leading-6 text-muted-foreground">
                                    <span className="font-semibold text-foreground">{batchToDelete.name}</span> dan semua laporan di dalamnya akan dihapus permanen.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 p-6">
                            {deleteError && (
                                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                                    {deleteError}
                                </p>
                            )}
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setBatchToDelete(null)}
                                    disabled={isDeleting}
                                >
                                    Batal
                                </Button>
                                <Button
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    {isDeleting ? "Menghapus..." : "Ya, Hapus Batch"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </NavigationLayout>
    )
}

interface BatchSectionProps {
    title: string
    description: string
    batches: BatchListItem[]
    eventId: string
    status: 'active' | 'completed'
    hasBatchActions: boolean
    canEditBatch: boolean
    canDeleteBatch: boolean
    openMenuId: string | null
    onMenuToggle: (batchId: string) => void
    onDelete: (batch: BatchListItem) => void
}

function BatchSection({
    title,
    description,
    batches,
    eventId,
    status,
    hasBatchActions,
    canEditBatch,
    canDeleteBatch,
    openMenuId,
    onMenuToggle,
    onDelete,
}: BatchSectionProps) {
    const isActive = status === 'active'

    return (
        <section className="min-w-0 max-w-full" aria-labelledby={`${status}-batch-title`}>
            <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 id={`${status}-batch-title`} className="text-lg font-bold text-foreground">
                            {title}
                        </h2>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                            {batches.length}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
            </div>

            {batches.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-card/40 px-5 py-8 text-center text-sm text-muted-foreground">
                    {isActive ? "Tidak ada batch aktif saat ini." : "Belum ada batch yang selesai."}
                </div>
            ) : (
                <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
                    {batches.map((batch) => (
                        <BatchCard
                            key={batch.id}
                            batch={batch}
                            eventId={eventId}
                            isActive={isActive}
                            hasBatchActions={hasBatchActions}
                            canEditBatch={canEditBatch}
                            canDeleteBatch={canDeleteBatch}
                            isMenuOpen={openMenuId === batch.id}
                            onMenuToggle={() => onMenuToggle(batch.id)}
                            onDelete={() => onDelete(batch)}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}

interface BatchCardProps {
    batch: BatchListItem
    eventId: string
    isActive: boolean
    hasBatchActions: boolean
    canEditBatch: boolean
    canDeleteBatch: boolean
    isMenuOpen: boolean
    onMenuToggle: () => void
    onDelete: () => void
}

function BatchCard({
    batch,
    eventId,
    isActive,
    hasBatchActions,
    canEditBatch,
    canDeleteBatch,
    isMenuOpen,
    onMenuToggle,
    onDelete,
}: BatchCardProps) {
    return (
        <Card className={cn(
            "group relative w-full min-w-0 max-w-full overflow-visible rounded-2xl border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
            isActive ? "border-success/25" : "border-border/80"
        )} data-testid={`batch-card-${batch.id}`}>
            <div className={cn(
                "absolute inset-y-5 left-0 w-1 rounded-r-full",
                isActive ? "bg-success" : "bg-muted-foreground/30"
            )} />

            <Link
                href={`/events/${eventId}?batch=${batch.id}`}
                className={cn(
                    "block min-w-0 max-w-full overflow-hidden rounded-2xl p-5 pr-14 sm:p-6 sm:pr-16",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                aria-label={`Buka detail ${batch.name}`}
            >
                <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
                    <h3 className="min-w-0 max-w-full break-words text-lg font-bold tracking-tight text-foreground [overflow-wrap:anywhere] transition-colors group-hover:text-primary">
                        {batch.name}
                    </h3>
                    <span className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                        isActive
                            ? "bg-success/[0.12] text-success"
                            : "bg-muted text-muted-foreground"
                    )}>
                        {isActive ? "Aktif" : "Selesai"}
                    </span>
                </div>

                <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoBlock
                        icon={<CalendarDays className="h-4 w-4" />}
                        label="Periode"
                        value={`${formatDate(batch.startDate)} — ${batch.endDate ? formatDate(batch.endDate) : 'Tanpa batas'}`}
                    />
                    <InfoBlock
                        icon={<Banknote className="h-4 w-4" />}
                        label="Harga tiket"
                        value={formatCurrency(batch.price)}
                    />
                </div>

                <div className="mt-3 min-w-0 max-w-full rounded-xl border border-border/70 bg-muted/50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        Catatan
                    </div>
                    <p className={cn(
                        "mt-1.5 max-w-full whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]",
                        batch.notes ? "text-foreground" : "italic text-muted-foreground"
                    )}>
                        {batch.notes || "Tidak ada catatan untuk batch ini."}
                    </p>
                </div>

                <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1.5 break-words [overflow-wrap:anywhere]">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />
                        Dibuat {formatCreatedAt(batch.createdAt)}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-semibold text-primary">
                        Buka detail
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                </div>
            </Link>

            {hasBatchActions && (
                <div className="absolute right-3 top-3 z-20" data-batch-menu>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-card/80 text-muted-foreground shadow-sm hover:text-foreground"
                        onClick={onMenuToggle}
                        aria-label={`Opsi ${batch.name}`}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                    >
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>

                    {isMenuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl"
                        >
                            {canEditBatch && (
                                <Link
                                    role="menuitem"
                                    href={`/events/${eventId}/batches/${batch.id}/edit`}
                                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors hover:bg-accent focus:bg-accent"
                                >
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                    Edit Batch
                                </Link>
                            )}
                            {canDeleteBatch && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
                                    onClick={onDelete}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Hapus Batch
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Card>
    )
}

function InfoBlock({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode
    label: string
    value: string
}) {
    return (
        <div className="min-w-0 rounded-xl border border-border/70 bg-background-secondary/70 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                {icon}
                {label}
            </div>
            <p className="mt-1.5 max-w-full break-words text-sm font-semibold leading-5 text-foreground [overflow-wrap:anywhere]">{value}</p>
        </div>
    )
}
