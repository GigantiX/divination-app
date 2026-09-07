"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Check, X, Loader2, UploadCloud, Download } from "lucide-react"

import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type UserProfile } from "@/app/actions/profile"
import { getPendingQueue, updateRequestStatus, uploadBudgetProof, type BudgetRequest } from "@/app/actions/budget"
import { compressImage } from "@/lib/image"

function formatIDR(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export function QueueClient({ profile }: { profile: UserProfile }) {
    const isAdmin = profile.role === "admin" || profile.role === "developer"
    const [queue, setQueue] = React.useState<BudgetRequest[]>([])
    const [loading, setLoading] = React.useState(true)
    
    // Approval modal state
    const [approvingItem, setApprovingItem] = React.useState<BudgetRequest | null>(null)
    const [proofFile, setProofFile] = React.useState<File | null>(null)
    const [proofPreview, setProofPreview] = React.useState<string | null>(null)
    const [isProcessing, setIsProcessing] = React.useState(false)
    const [errorMsg, setErrorMsg] = React.useState("")

    const handleExport = (type: string, format: string) => {
        const url = `/api/export?type=${type}&format=${format}`
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${type}.${format}`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    React.useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const res = await getPendingQueue()
        if (res.data) setQueue(res.data)
        setLoading(false)
    }

    const handleReject = async (id: string) => {
        if (!confirm("Yakin ingin menolak request ini?")) return
        
        // Optimistic update for better UX could go here, but let's just reload for safety
        await updateRequestStatus(id, 'rejected')
        loadData()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        if (!file.type.startsWith('image/')) {
            setErrorMsg("Hanya file gambar yang diperbolehkan")
            return
        }

        setProofFile(file)
        const previewUrl = URL.createObjectURL(file)
        setProofPreview(previewUrl)
        setErrorMsg("")
    }

    const submitApproval = async () => {
        if (!approvingItem || !proofFile) {
            setErrorMsg("Pilih bukti transfer terlebih dahulu")
            return
        }

        setIsProcessing(true)
        setErrorMsg("")

        try {
            // Compress image before upload
            const compressedBlob = await compressImage(proofFile, 1920, 1080)
            const compressedFile = new File([compressedBlob], proofFile.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            })

            const formData = new FormData()
            formData.append('file', compressedFile)

            const uploadRes = await uploadBudgetProof(formData)
            if (uploadRes.error || !uploadRes.url) {
                throw new Error(uploadRes.error || "Gagal mengupload bukti")
            }

            const updateRes = await updateRequestStatus(approvingItem.id, 'approved', uploadRes.url)
            if (updateRes.error) {
                throw new Error(updateRes.error)
            }

            // Success
            setApprovingItem(null)
            setProofFile(null)
            setProofPreview(null)
            loadData()

        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan")
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <NavigationLayout isAdmin={isAdmin}>
            <div className="flex-1 p-4 pb-24 md:mx-auto md:w-full md:max-w-4xl md:p-6">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/apps/request-budget" className="p-2 -ml-2 rounded-full hover:bg-accent transition-colors">
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Queue Request</h1>
                            <p className="text-sm text-muted-foreground">Daftar antrian persetujuan budget iklan.</p>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExport("budget-history", "csv")}
                                className="flex items-center gap-1.5 border-success/30 text-success hover:bg-success/20"
                            >
                                <Download className="h-4 w-4" /> Export CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExport("budget-history", "xlsx")}
                                className="flex items-center gap-1.5 border-success/30 text-success hover:bg-success/20"
                            >
                                <Download className="h-4 w-4" /> Export Excel
                            </Button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : queue.length === 0 ? (
                    <div className="text-center p-12 bg-card rounded-xl border border-border">
                        <p className="text-muted-foreground">Tidak ada request budget yang pending.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {queue.map((req) => (
                            <Card key={req.id} className="border-border shadow-sm overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="font-medium text-foreground">{req.user_name}</span>
                                                <span>&bull;</span>
                                                <span>{new Date(req.created_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}</span>
                                            </div>
                                            <h3 className="font-semibold text-foreground">{req.event_name}</h3>
                                            <p className="text-xl font-bold text-primary">{formatIDR(req.amount)}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                            <Button 
                                                variant="outline" 
                                                className="border-destructive/30 text-destructive hover:bg-destructive/15 hover:text-destructive"
                                                onClick={() => handleReject(req.id)}
                                            >
                                                <X className="h-4 w-4 mr-1" /> Tolak
                                            </Button>
                                            <Button 
                                                className="bg-success hover:bg-success/85 text-success-foreground"
                                                onClick={() => setApprovingItem(req)}
                                            >
                                                <Check className="h-4 w-4 mr-1" /> Setujui
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Approval Upload Modal */}
            {approvingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
                    <Card className="w-full max-w-md border-none shadow-xl">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between border-b p-4">
                                <h3 className="text-lg font-bold">Approve Request</h3>
                                <button 
                                    onClick={() => {
                                        setApprovingItem(null)
                                        setProofFile(null)
                                        setProofPreview(null)
                                        setErrorMsg("")
                                    }} 
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="bg-muted p-3 rounded-lg text-sm space-y-1 mb-2 border border-border">
                                    <p><span className="text-muted-foreground">Request:</span> <span className="font-semibold">{formatIDR(approvingItem.amount)}</span></p>
                                    <p><span className="text-muted-foreground">Event:</span> {approvingItem.event_name}</p>
                                </div>

                                {errorMsg && (
                                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg">
                                        {errorMsg}
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Unggah Bukti Transfer</label>
                                    
                                    {!proofPreview ? (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted hover:bg-accent">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground"><span className="font-semibold">Klik untuk unggah</span> gambar</p>
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-lg overflow-hidden border border-border bg-muted flex justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={proofPreview} alt="Preview" className="max-h-48 object-contain" />
                                            <button 
                                                className="absolute top-2 right-2 bg-overlay/50 text-primary-foreground rounded-full p-1 hover:bg-overlay/70"
                                                onClick={() => {
                                                    setProofFile(null)
                                                    setProofPreview(null)
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        className="flex-1"
                                        onClick={() => {
                                            setApprovingItem(null)
                                            setProofFile(null)
                                            setProofPreview(null)
                                        }}
                                        disabled={isProcessing}
                                    >
                                        Batal
                                    </Button>
                                    <Button 
                                        className="flex-1 bg-success hover:bg-success/85 text-success-foreground"
                                        onClick={submitApproval}
                                        disabled={isProcessing || !proofFile}
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                        {isProcessing ? "Menyimpan..." : "Approve"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </NavigationLayout>
    )
}
