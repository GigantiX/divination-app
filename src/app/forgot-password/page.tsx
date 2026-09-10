"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"

import { requestPasswordResetAction } from "@/app/actions/password-reset"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState = { status: "idle" as const, message: "" }

export default function ForgotPasswordPage() {
    const [state, formAction, isPending] = React.useActionState(
        requestPasswordResetAction,
        initialState
    )

    return (
        <main className="flex min-h-screen flex-col bg-background-secondary">
            <div className="p-6 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">DIVINATION</h1>
            </div>

            <div className="flex flex-1 items-center justify-center p-4 pb-16">
                <Card className="w-full max-w-md border-none shadow-lg sm:border-solid">
                    <CardHeader className="items-center space-y-3 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Mail className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div className="space-y-1.5">
                            <CardTitle className="text-xl font-semibold">Lupa kata sandi?</CardTitle>
                            <CardDescription className="leading-relaxed">
                                Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    {state.status === "success" ? (
                        <CardContent className="space-y-5">
                            <div
                                className="flex gap-3 rounded-xl bg-success/15 p-4 text-success"
                                role="status"
                            >
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                                <p className="text-sm font-medium leading-relaxed">{state.message}</p>
                            </div>
                            <Link
                                href="/login"
                                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                            >
                                Kembali ke halaman masuk
                            </Link>
                        </CardContent>
                    ) : (
                        <form action={formAction}>
                            <CardContent className="space-y-4">
                                {state.status === "error" ? (
                                    <div
                                        className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
                                        role="alert"
                                    >
                                        {state.message}
                                    </div>
                                ) : null}

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="email@contoh.com"
                                        required
                                        disabled={isPending}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4">
                                <Button type="submit" className="w-full" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        "Kirim tautan reset"
                                    )}
                                </Button>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                                >
                                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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
