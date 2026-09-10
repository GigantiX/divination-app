"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { loginAction } from "@/app/actions/auth"

const initialLoginActionState = { error: "" }

export default function LoginPage() {
    const [showPassword, setShowPassword] = React.useState(false)
    const [state, formAction, isPending] = React.useActionState(loginAction, initialLoginActionState)

    const togglePassword = () => setShowPassword((value) => !value)

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            <div className="p-6 text-center">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">DIVINATION</h1>
            </div>
            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-md border-none shadow-lg sm:border-solid">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-xl font-semibold">Masuk</CardTitle>
                        <CardDescription>
                            Masukkan email dan password Anda
                        </CardDescription>
                    </CardHeader>
                    <form action={formAction}>
                        <CardContent className="space-y-4">
                            {state.error && (
                                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                                    {state.error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="email@contoh.com"
                                    required
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs font-semibold text-primary hover:underline"
                                    >
                                        Lupa kata sandi?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        disabled={isPending}
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePassword}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        disabled={isPending}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">Toggle password visibility</span>
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button type="submit" className="w-full" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    "Masuk"
                                )}
                            </Button>
                            <div className="text-center text-sm text-muted-foreground">
                                Belum punya akun?{" "}
                                <Link href="/register" className="font-semibold text-primary hover:underline">
                                    Daftar
                                </Link>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}
