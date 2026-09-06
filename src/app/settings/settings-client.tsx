"use client"

import * as React from "react"
import Link from "next/link"
import {
    Lock,
    HelpCircle,
    Power,
    ChevronRight,
    LogOut,
    Loader2,
    Smile,
    X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { NavigationLayout } from "@/components/ui/nav-layout"
import { ThemeSelector } from "@/components/ui/theme-selector"
import { logoutAction } from "@/app/actions/auth"
import { disconnectFacebookAction, updateEmoji, type FacebookConnectionStatus, type UserProfile } from "@/app/actions/profile"
import { getEmojisByCategory } from "@/lib/emojis"

interface SettingsClientProps {
    profile: UserProfile
    facebookConnection: FacebookConnectionStatus | null
}

export function SettingsClient({ profile, facebookConnection }: SettingsClientProps) {
    const [showLogoutDialog, setShowLogoutDialog] = React.useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false)
    const [isLoggingOut, setIsLoggingOut] = React.useState(false)
    const [isSavingEmoji, setIsSavingEmoji] = React.useState(false)
    const [isDisconnectingFacebook, setIsDisconnectingFacebook] = React.useState(false)
    const [facebookMessage, setFacebookMessage] = React.useState<string | null>(null)
    const [selectedEmoji, setSelectedEmoji] = React.useState(profile.emoji || "😀")
    const [activeCategory, setActiveCategory] = React.useState<"faces" | "animals" | "objects">("faces")

    const emojiCategories = getEmojisByCategory()

    const handleLogout = async () => {
        setIsLoggingOut(true)
        await logoutAction()
    }

    const handleSelectEmoji = async (emoji: string) => {
        setIsSavingEmoji(true)
        setSelectedEmoji(emoji)

        const result = await updateEmoji(emoji)

        if (result.error) {
            // Revert on error
            setSelectedEmoji(profile.emoji || "😀")
        }

        setIsSavingEmoji(false)
        setShowEmojiPicker(false)
    }

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const fbStatus = params.get('fb')

        if (fbStatus === 'connected') {
            setFacebookMessage('Akun Facebook berhasil terhubung.')
        } else if (fbStatus === 'already-linked') {
            setFacebookMessage('Akun Facebook ini sudah terhubung ke user lain.')
        } else if (fbStatus === 'disconnected') {
            setFacebookMessage('Koneksi Facebook berhasil diputuskan.')
        } else if (fbStatus === 'error') {
            setFacebookMessage('Gagal menghubungkan Facebook. Silakan coba lagi.')
        }

        if (fbStatus) {
            window.history.replaceState({}, '', '/settings')
        }
    }, [])

    const handleDisconnectFacebook = async () => {
        setIsDisconnectingFacebook(true)
        setFacebookMessage(null)

        const result = await disconnectFacebookAction()
        if (result.error) {
            setFacebookMessage(result.error)
            setIsDisconnectingFacebook(false)
            return
        }

        window.location.href = '/settings?fb=disconnected'
    }

    const handleConnectFacebook = () => {
        window.location.href = '/api/facebook/connect'
    }

    const connectedDate = facebookConnection?.connectedAt
        ? new Date(facebookConnection.connectedAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : null

    return (
        <NavigationLayout isAdmin={profile.role === "admin" || profile.role === "developer"}>
            {/* Content */}
            <div className="flex-1 p-4 pb-24 md:max-w-2xl md:mx-auto md:w-full">
                {/* Profile Card */}
                <Card className="border-none shadow-sm mb-4">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                            {/* Emoji Avatar - Clickable */}
                            <button
                                onClick={() => setShowEmojiPicker(true)}
                                className="relative mb-4 group"
                            >
                                <AvatarEmoji
                                    emoji={selectedEmoji}
                                    size="xl"
                                    className="border-4 border-card shadow-lg transition-transform group-hover:scale-105"
                                />
                                <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center border-2 border-card shadow-md">
                                    <Smile className="h-4 w-4 text-primary-foreground" />
                                </div>
                            </button>

                            {/* Name and Email */}
                            <h2 className="text-xl font-bold text-foreground mb-1">{profile.full_name}</h2>
                            <p className="text-muted-foreground mb-4">{profile.username}</p>

                            {/* Edit Profile Button */}
                            <Link href="/settings/edit-profile">
                                <Button
                                    variant="outline"
                                    className="rounded-full px-6 text-foreground border-border hover:bg-accent"
                                >
                                    Edit Profil
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-4 border-none shadow-sm">
                    <CardContent className="p-5">
                        <div className="mb-4">
                            <h2 className="font-semibold text-foreground">Tampilan</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Pilih tema terang, gelap, atau ikuti pengaturan perangkat Anda.
                            </p>
                        </div>
                        <ThemeSelector />
                    </CardContent>
                </Card>

                {/* Menu Items */}
                <Card className="border-none shadow-sm mb-4">
                    <CardContent className="p-0">
                        {/* Facebook Connect */}
                        <div className="border-b border-border p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                                        <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M22 12.07C22 6.503 17.523 2 12 2S2 6.503 2 12.07c0 5.017 3.657 9.18 8.438 9.93v-7.02H7.898v-2.91h2.54V9.845c0-2.52 1.492-3.914 3.778-3.914 1.095 0 2.238.197 2.238.197v2.475h-1.26c-1.242 0-1.629.775-1.629 1.57v1.886h2.773l-.443 2.91h-2.33V22c4.781-.75 8.438-4.913 8.438-9.93Z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">Connect Facebook</p>
                                        <p className="text-xs text-muted-foreground">
                                            {facebookConnection?.connected
                                                ? `Terhubung${facebookConnection.facebookEmail ? ` sebagai ${facebookConnection.facebookEmail}` : ''}${connectedDate ? ` sejak ${connectedDate}` : ''}`
                                                : 'Hubungkan akun Facebook untuk integrasi aplikasi'
                                            }
                                        </p>
                                    </div>
                                </div>
                                {facebookConnection?.connected ? (
                                    <Button
                                        variant="outline"
                                        onClick={handleDisconnectFacebook}
                                        disabled={isDisconnectingFacebook}
                                        className="h-9 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/15 hover:text-destructive"
                                    >
                                        {isDisconnectingFacebook ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Memutuskan...
                                            </>
                                        ) : (
                                            'Disconnect'
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleConnectFacebook}
                                        className="h-9 rounded-lg bg-primary hover:bg-primary-hover"
                                    >
                                        Connect
                                    </Button>
                                )}
                            </div>
                            {facebookMessage && (
                                <p className="mt-2 text-xs text-muted-foreground">{facebookMessage}</p>
                            )}
                        </div>

                        {/* Change Emoji */}
                        <button
                            onClick={() => setShowEmojiPicker(true)}
                            className="flex items-center justify-between p-4 hover:bg-accent transition-colors cursor-pointer border-b border-border w-full text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15">
                                    <Smile className="h-5 w-5 text-warning" />
                                </div>
                                <span className="font-medium text-foreground">Ubah Emoji Profil</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </button>

                        {/* Change Password */}
                        <Link href="/settings/change-password">
                            <div className="flex items-center justify-between p-4 hover:bg-accent transition-colors cursor-pointer border-b border-border">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                                        <Lock className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="font-medium text-foreground">Ubah Kata Sandi</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </Link>

                        {/* Help Center */}
                        <Link href="/settings/help">
                            <div className="flex items-center justify-between p-4 hover:bg-accent transition-colors cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                                        <HelpCircle className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="font-medium text-foreground">Pusat Bantuan</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </Link>
                    </CardContent>
                </Card>

                {/* Logout Card */}
                <Card className="border-none shadow-sm">
                    <CardContent className="p-0">
                        <button
                            onClick={() => setShowLogoutDialog(true)}
                            className="flex items-center gap-4 w-full p-4 hover:bg-destructive/15 transition-colors"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
                                <Power className="h-5 w-5 text-destructive" />
                            </div>
                            <span className="font-medium text-destructive">Keluar</span>
                        </button>
                    </CardContent>
                </Card>
            </div>

            {/* Emoji Picker Modal */}
            {showEmojiPicker && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay/50">
                    <div className="w-full max-w-md rounded-t-3xl bg-card p-4 shadow-xl animate-in slide-in-from-bottom">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-foreground">Pilih Emoji</h3>
                            <button
                                onClick={() => setShowEmojiPicker(false)}
                                className="p-2 hover:bg-accent rounded-full"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveCategory("faces")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === "faces"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                                    }`}
                            >
                                😀 Wajah
                            </button>
                            <button
                                onClick={() => setActiveCategory("animals")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === "animals"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                                    }`}
                            >
                                🐶 Hewan
                            </button>
                            <button
                                onClick={() => setActiveCategory("objects")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === "objects"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                                    }`}
                            >
                                ⭐ Objek
                            </button>
                        </div>

                        {/* Emoji Grid */}
                        <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto pb-4">
                            {emojiCategories[activeCategory].map((emoji, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelectEmoji(emoji)}
                                    disabled={isSavingEmoji}
                                    className={`h-10 w-10 flex items-center justify-center text-2xl rounded-lg transition-all hover:bg-accent hover:scale-110 ${selectedEmoji === emoji ? "bg-primary/15 ring-2 ring-primary" : ""
                                        } ${isSavingEmoji ? "opacity-50" : ""}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        {/* Loading indicator */}
                        {isSavingEmoji && (
                            <div className="flex items-center justify-center gap-2 py-2 text-primary">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Menyimpan...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Logout Confirmation Dialog */}
            {showLogoutDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
                    <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
                                <LogOut className="h-8 w-8 text-destructive" />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-center text-xl font-bold text-foreground mb-2">
                            Keluar dari Akun?
                        </h3>
                        <p className="text-center text-muted-foreground mb-6">
                            Anda akan keluar dari akun ini. Pastikan semua perubahan sudah tersimpan.
                        </p>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowLogoutDialog(false)}
                                className="h-12 rounded-xl border-border font-semibold"
                                disabled={isLoggingOut}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleLogout}
                                className="h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive-hover font-semibold"
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Keluar...
                                    </>
                                ) : (
                                    "Ya, Keluar"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </NavigationLayout>
    )
}
