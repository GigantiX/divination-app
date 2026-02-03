"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
    const [showPassword, setShowPassword] = React.useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log("Register attempted")
    }

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            <div className="p-6 text-center">
                <h1 className="text-3xl font-bold text-black tracking-tight">DIVINATION</h1>
            </div>
            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-md border-none shadow-lg sm:border-solid">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-xl font-semibold">Create an account</CardTitle>
                        <CardDescription>
                            Enter your details below to create your account
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="m@example.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Display Name</Label>
                                <Input id="name" type="text" placeholder="John Doe" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button type="submit" className="w-full">
                                Create account
                            </Button>
                            <div className="text-center text-sm text-text-secondary">
                                Already have an account?{" "}
                                <Link href="/login" className="font-semibold text-primary hover:underline">
                                    Sign In
                                </Link>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}
