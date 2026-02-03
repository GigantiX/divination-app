"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
    const [showPassword, setShowPassword] = React.useState(false)

    const togglePassword = () => setShowPassword(!showPassword)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log("Login attempted")
    }

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            <div className="p-6 text-center">
                <h1 className="text-3xl font-bold text-black tracking-tight">DIVINATION</h1>
            </div>
            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-md border-none shadow-lg sm:border-solid">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-xl font-semibold">Sign in</CardTitle>
                        <CardDescription>
                            Enter your email to sign in to your account
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="m@example.com" required />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePassword}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
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
                            <Button type="submit" className="w-full">
                                Sign In
                            </Button>
                            <div className="text-center text-sm text-text-secondary">
                                Don&apos;t have an account?{" "}
                                <Link href="/register" className="font-semibold text-primary hover:underline">
                                    Register
                                </Link>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}
