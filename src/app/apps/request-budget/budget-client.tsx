"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, ListTodo, ImageIcon, X, Loader2 } from "lucide-react"

import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type UserProfile } from "@/app/actions/profile"
import { getBudgetRequests, submitBudgetRequest, getAvailableEventsForBudget, type BudgetRequest } from "@/app/actions/budget"

function formatIDR(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

function parseIDRInput(value: string) {
    return value.replace(/[^0-9]/g, '')
}

export function BudgetClient({ profile }: { profile: UserProfile }) {
    const isAdmin = profile.role === "admin" || profile.role === "developer"
    const [requests, setRequests] = React.useState<BudgetRequest[]>([])
    const [events, setEvents] = React.useState<{id: string, name: string}[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    
    const [amountInput, setAmountInput] = React.useState("")
    const [selectedEventId, setSelectedEventId] = React.useState("")
    const [submitError, setSubmitError] = React.useState("")

    const [proofModalUrl, setProofModalUrl] = React.useState<string | null>(null)

    async function loadData() {
        setLoading(true)
        const [reqRes, eventRes] = await Promise.all([
            getBudgetRequests(),
            getAvailableEventsForBudget()
        ])
        
        if (reqRes.data) setRequests(reqRes.data)
        if (eventRes.data) setEvents(eventRes.data)
        setLoading(false)
    }

    React.useEffect(() => {
        loadData()
    }, [])

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = parseIDRInput(e.target.value)
        if (raw === "") {
            setAmountInput("")
            return
        }
        if (raw.startsWith("0")) return // prevent leading zero
        
        const num = parseInt(raw, 10)
        setAmountInput(num.toLocaleString('id-ID'))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitError("")
        
        const amount = parseInt(parseIDRInput(amountInput), 10)
        if (isNaN(amount) || amount <= 0) {
            setSubmitError("Jumlah budget tidak valid")
            return
        }
        if (!selectedEventId) {
            setSubmitError("Pilih event terlebih dahulu")
            return
        }

        setIsSubmitting(true)
        const res = await submitBudgetRequest(selectedEventId, amount)
        if (res.error) {
            setSubmitError(res.error)
            setIsSubmitting(false)
        } else {
            setIsSubmitModalOpen(false)
            setAmountInput("")
            setSelectedEventId("")
            setIsSubmitting(false)
            loadData()
        }
    }

    return (
        <NavigationLayout isAdmin={isAdmin}>
            <div className="flex-1 p-4 pb-24 md:mx-auto md:w-full md:max-w-4xl md:p-6">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Request Budget</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Riwayat request budget iklan.</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        {isAdmin && (
                            <Link href="/apps/request-budget/queue" passHref>
                                <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2 border-warning/30 bg-warning/15 text-warning hover:bg-warning/20 hover:text-warning">
                                    <ListTodo className="h-4 w-4" /> Queue
                                </Button>
                            </Link>
                        )}
                        <Button 
                            className="w-full sm:w-auto flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground"
                            onClick={() => setIsSubmitModalOpen(true)}
                        >
                            <Plus className="h-4 w-4" /> Request Baru
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center p-12 bg-card rounded-xl border border-border">
                        <p className="text-muted-foreground">Belum ada riwayat request budget.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requests.map((req) => (
                            <Card key={req.id} className="border-border shadow-sm overflow-hidden">
                                <CardContent className="p-4 sm:p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                                                    {new Date(req.created_at).toLocaleDateString('id-ID', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })}
                                                </span>
                                                <StatusBadge status={req.status} />
                                            </div>
                                            <h3 className="font-semibold text-foreground">{req.event_name || 'Unknown Event'}</h3>
                                            {isAdmin && req.user_name && (
                                                <p className="text-xs text-muted-foreground">Oleh: <span className="font-medium text-foreground">{req.user_name}</span></p>
                                            )}
                                            <p className="text-xl font-bold text-primary">{formatIDR(req.amount)}</p>
                                        </div>
                                        
                                        {req.status === 'approved' && req.proof_image_url && (
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => setProofModalUrl(req.proof_image_url!)}
                                                className="flex items-center gap-2"
                                            >
                                                <ImageIcon className="h-4 w-4" /> Lihat Bukti
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Submit Modal */}
            {isSubmitModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
                    <Card className="w-full max-w-md border-none shadow-xl">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between border-b p-4">
                                <h3 className="text-lg font-bold">Request Budget Baru</h3>
                                <button onClick={() => setIsSubmitModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                {submitError && (
                                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg">
                                        {submitError}
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Event</label>
                                    <select 
                                        className="w-full rounded-md border border-border p-2 text-sm focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary"
                                        value={selectedEventId}
                                        onChange={(e) => setSelectedEventId(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Pilih Event...</option>
                                        {events.map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Jumlah (IDR)</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-muted-foreground sm:text-sm">Rp</span>
                                        </div>
                                        <input 
                                            type="text"
                                            value={amountInput}
                                            onChange={handleAmountChange}
                                            className="w-full rounded-md border border-border py-2 pl-10 pr-3 text-sm focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="10.000.000"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button 
                                        type="submit" 
                                        className="w-full bg-primary hover:bg-primary-hover"
                                        disabled={isSubmitting || !selectedEventId || !amountInput}
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {isSubmitting ? "Mengirim..." : "Submit Request"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Proof Modal */}
            {proofModalUrl && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/80 p-4" onClick={() => setProofModalUrl(null)}>
                    <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
                        <button 
                            className="absolute -top-10 right-0 text-primary-foreground hover:text-foreground bg-overlay/50 rounded-full p-2"
                            onClick={() => setProofModalUrl(null)}
                        >
                            <X className="h-6 w-6" />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={proofModalUrl} 
                            alt="Bukti Transfer" 
                            className="rounded-lg max-h-[85vh] object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </NavigationLayout>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'process':
            return <span className="bg-warning/15 text-warning px-2 py-0.5 rounded text-xs font-semibold">Diproses</span>
        case 'approved':
            return <span className="bg-success/15 text-success px-2 py-0.5 rounded text-xs font-semibold">Disetujui</span>
        case 'rejected':
            return <span className="bg-destructive/15 text-destructive px-2 py-0.5 rounded text-xs font-semibold">Ditolak</span>
        default:
            return <span className="bg-muted text-foreground px-2 py-0.5 rounded text-xs font-semibold">{status}</span>
    }
}
