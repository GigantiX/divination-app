"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
    ChevronLeft,
    Plus,
    Loader2,
    Shield,
    ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { cn } from "@/lib/utils"
import {
    getUserDetail,
    revokeAssignment,
    updateUserRole,
    type UserDetailData,
} from "@/app/actions/people"

const getRoleBadgeStyle = (role: "pic" | "advertiser") => {
    switch (role) {
        case "pic":
            return { bgColor: "bg-primary/15", textColor: "text-primary", label: "PIC" }
        case "advertiser":
            return { bgColor: "bg-primary/15", textColor: "text-primary", label: "Advertiser" }
    }
}

const getGlobalRoleConfig = (role: string) => {
    switch (role) {
        case "developer":
            return { label: "Developer", bgColor: "bg-primary/15", textColor: "text-primary" }
        case "admin":
            return { label: "Admin", bgColor: "bg-primary/15", textColor: "text-primary" }
        default:
            return { label: "User", bgColor: "bg-muted", textColor: "text-foreground" }
    }
}

export default function UserDetailPage() {
    const params = useParams()
    const router = useRouter()
    const userId = params.id as string

    const [user, setUser] = React.useState<UserDetailData | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [revokingId, setRevokingId] = React.useState<string | null>(null)
    const [isChangingRole, setIsChangingRole] = React.useState(false)
    const [showRoleConfirm, setShowRoleConfirm] = React.useState(false)
    const [pendingRole, setPendingRole] = React.useState<'admin' | 'user' | null>(null)

    const loadUser = React.useCallback(async () => {
        const result = await getUserDetail(userId)
        if (result.error) {
            setError(result.error)
        } else if (result.user) {
            setUser(result.user)
        }
        setIsLoading(false)
    }, [userId])

    React.useEffect(() => {
        loadUser()
    }, [loadUser])

    const handleRevoke = async (assignmentId: string) => {
        setRevokingId(assignmentId)
        const result = await revokeAssignment(assignmentId)
        if (result.error) {
            setError(result.error)
            setRevokingId(null)
            return
        }
        // Reload user data
        await loadUser()
        setRevokingId(null)
    }

    const handleRoleChange = async () => {
        if (!pendingRole) return
        setIsChangingRole(true)
        const result = await updateUserRole(userId, pendingRole)
        if (result.error) {
            setError(result.error)
        } else {
            await loadUser()
        }
        setIsChangingRole(false)
        setShowRoleConfirm(false)
        setPendingRole(null)
    }

    const globalRoleConfig = user ? getGlobalRoleConfig(user.role) : null

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col bg-muted">
                <div className="bg-card px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link href="/people">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold text-foreground">User Details</h1>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        )
    }

    if (error && !user) {
        return (
            <div className="flex min-h-screen flex-col bg-muted">
                <div className="bg-card px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link href="/people">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold text-foreground">User Details</h1>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-destructive">{error}</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    const isAdminOrDev = user.role === "admin" || user.role === "developer"

    return (
        <div className="flex min-h-screen flex-col bg-muted">
            {/* Header */}
            <div className="bg-card px-4 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/people">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-foreground">User Details</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:max-w-2xl md:mx-auto md:w-full">
                {/* Profile Section */}
                <div className="flex flex-col items-center text-center mb-8">
                    <AvatarEmoji emoji={user.emoji} size="lg" className="mb-4 border-4 border-card shadow-lg" />

                    <h2 className="text-2xl font-bold text-foreground mb-1">{user.name}</h2>
                    <p className="text-muted-foreground mb-3">@{user.username}</p>

                    {/* Global Role Badge */}
                    {globalRoleConfig && (
                        <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                            globalRoleConfig.bgColor, globalRoleConfig.textColor
                        )}>
                            {user.role === "developer" && <ShieldCheck className="h-3.5 w-3.5" />}
                            {user.role === "admin" && <Shield className="h-3.5 w-3.5" />}
                            {globalRoleConfig.label}
                        </span>
                    )}
                </div>

                {/* Role Management (Developer only, for non-developer users) */}
                {user.role !== "developer" && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Global Role
                        </h3>
                        <Card className="border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Role saat ini: <span className="font-semibold">{globalRoleConfig?.label}</span>
                                    </p>
                                    {user.role === "user" ? (
                                        <Button
                                            variant="outline"
                                            className="text-sm"
                                            onClick={() => {
                                                setPendingRole("admin")
                                                setShowRoleConfirm(true)
                                            }}
                                        >
                                            <Shield className="h-3.5 w-3.5 mr-1" />
                                            Jadikan Admin
                                        </Button>
                                    ) : user.role === "admin" ? (
                                        <Button
                                            variant="outline"
                                            className="text-sm text-warning hover:text-warning hover:bg-warning/20"
                                            onClick={() => {
                                                setPendingRole("user")
                                                setShowRoleConfirm(true)
                                            }}
                                        >
                                            Turunkan ke User
                                        </Button>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Assign to Event Button — Only for regular users */}
                {!isAdminOrDev && (
                    <Link href={`/people/${userId}/assign`}>
                        <Button className="w-full h-14 rounded-2xl text-base font-semibold mb-8 bg-primary hover:bg-primary-hover">
                            <Plus className="h-5 w-5 mr-2" />
                            Tugaskan ke Event
                        </Button>
                    </Link>
                )}

                {isAdminOrDev && (
                    <div className="mb-8 rounded-lg bg-primary/15 px-4 py-3">
                        <p className="text-xs text-primary">
                            ℹ️ {user.role === "developer" ? "Developer" : "Admin"} memiliki akses ke semua event secara otomatis.
                        </p>
                    </div>
                )}

                {/* Error display */}
                {error && (
                    <div className="mb-4 rounded-lg bg-destructive/15 px-4 py-3">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Assigned Events Section */}
                <div>
                    <h3 className="text-lg font-bold text-foreground mb-4">Event yang Ditugaskan</h3>

                    {user.assignments.length === 0 ? (
                        <Card className="border-none shadow-sm">
                            <CardContent className="p-8 text-center">
                                <p className="text-muted-foreground">Belum ada event yang ditugaskan</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {user.assignments.map((assignment) => {
                                const roleStyle = getRoleBadgeStyle(assignment.role)
                                return (
                                    <Card key={assignment.id} className="border-none shadow-sm">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-foreground mb-2">
                                                        {assignment.eventName}
                                                    </h4>
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                                                        roleStyle.bgColor,
                                                        roleStyle.textColor
                                                    )}>
                                                        {roleStyle.label}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/15 font-semibold"
                                                    onClick={() => handleRevoke(assignment.id)}
                                                    disabled={revokingId === assignment.id}
                                                >
                                                    {revokingId === assignment.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        "Revoke"
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Role Change Confirmation Dialog */}
            {showRoleConfirm && pendingRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
                    <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
                        <h3 className="text-center text-lg font-bold text-foreground mb-2">
                            Konfirmasi Perubahan Role
                        </h3>
                        <p className="text-center text-sm text-muted-foreground mb-6">
                            {pendingRole === "admin"
                                ? `Jadikan ${user.name} sebagai Admin? Admin memiliki akses ke semua event.`
                                : `Turunkan ${user.name} dari Admin menjadi User biasa?`
                            }
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setShowRoleConfirm(false)
                                    setPendingRole(null)
                                }}
                                disabled={isChangingRole}
                            >
                                Batal
                            </Button>
                            <Button
                                className={cn(
                                    "flex-1",
                                    pendingRole === "admin"
                                        ? "bg-primary hover:bg-primary-hover"
                                        : "bg-warning text-warning-foreground hover:bg-warning/85"
                                )}
                                onClick={handleRoleChange}
                                disabled={isChangingRole}
                            >
                                {isChangingRole ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Konfirmasi"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
