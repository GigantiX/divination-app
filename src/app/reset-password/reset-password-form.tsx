"use client"

import * as React from "react"
import Link from "next/link"
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, TriangleAlert } from "lucide-react"

import { resetPasswordAction } from "@/app/actions/password-reset"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState = { status: "idle" as const, message: "" }

interface ResetPasswordFormProps {
    token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
    const [showPassword, setShowPassword] = React.useState(false)
    const [showConfirmation, setShowConfirmation] = React.useState(false)
    const [state, formAction, isPending] = React.useActionState(resetPasswordAction, initialState)

    const tokenIsMissing = !token
    const resetSucceeded = state.status === "success"

    return (
        <main className="flex min-h-screen flex-col bg-background-secondary">
            <div className="p-6 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">DIVINATION</h1>
            </div>

            <div className="flex flex-1 items-center justify-center p-4 pb-16">
                <Card className="w-full max-w-md border-none shadow-lg sm:border-solid">
                    <CardHeader className="items-center space-y-3 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <KeyRound className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div className="space-y-1.5">
                            <CardTitle className="text-xl font-semibold">Buat kata sandi baru</CardTitle>
                            <CardDescription className="leading-relaxed">
                                Gunakan minimal 8 karakter dan hindari kata sandi yang pernah digunakan.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    {tokenIsMissing ? (
                        <CardContent className="space-y-5">
                            <div className="flex gap-3 rounded-xl bg-destructive/15 p-4 text-destructive" role="alert">
                                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                                <p className="text-sm font-medium leading-relaxed">
                                    Tautan reset tidak lengkap. Minta tautan baru dari halaman lupa kata sandi.
                                </p>
                            </div>
                            <Link
                                href="/forgot-password"
                                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                            >
                                Minta tautan baru
                            </Link>
                        </CardContent>
                    ) : resetSucceeded ? (
                        <CardContent className="space-y-5">
                            <div className="flex gap-3 rounded-xl bg-success/15 p-4 text-success" role="status">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                                <p className="text-sm font-medium leading-relaxed">{state.message}</p>
                            </div>
                            <Link
                                href="/login"
                                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                            >
                                Masuk dengan kata sandi baru
                            </Link>
                        </CardContent>
                    ) : (
                        <form action={formAction}>
                            <input type="hidden" name="token" value={token} />
                            <CardContent className="space-y-4">
                                {state.status === "error" ? (
                                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
                                        {state.message}
                                    </div>
                                ) : null}

                                <div className="space-y-2">
                                    <Label htmlFor="password">Kata sandi baru</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            minLength={8}
                                            required
                                            disabled={isPending}
                                            className="pr-11"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                                            disabled={isPending}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="passwordConfirmation">Konfirmasi kata sandi</Label>
                                    <div className="relative">
                                        <Input
                                            id="passwordConfirmation"
                                            name="passwordConfirmation"
                                            type={showConfirmation ? "text" : "password"}
                                            autoComplete="new-password"
                                            minLength={8}
                                            required
                                            disabled={isPending}
                                            className="pr-11"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmation((value) => !value)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label={showConfirmation ? "Sembunyikan konfirmasi" : "Tampilkan konfirmasi"}
                                            disabled={isPending}
                                        >
                                            {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4">
                                <Button type="submit" className="w-full" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                            Memperbarui...
                                        </>
                                    ) : (
                                        "Perbarui kata sandi"
                                    )}
                                </Button>
                                <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
                                    Kembali ke halaman masuk
                                </Link>
                            </CardFooter>
                        </form>
                    )}
                </Card>
            </div>
        </main>
    )
}
