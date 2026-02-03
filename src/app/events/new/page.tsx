"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Upload, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

export default function NewEventPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(false)
    const [preview, setPreview] = React.useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500))

        setIsLoading(false)
        router.push("/dashboard")
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center border-b bg-white px-4 py-4">
                <Link href="/dashboard" className="mr-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="flex-1 text-center text-lg font-bold text-black pr-12">
                    Create New Event
                </h1>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <Label>Event Logo</Label>
                                <div className={`relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${preview ? "border-primary/50" : "border-gray-200 hover:border-primary/50"}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                        onChange={handleImageChange}
                                    />
                                    {preview ? (
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className="h-full w-full rounded-lg object-contain p-2"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <div className="rounded-full bg-gray-50 p-2">
                                                <Upload className="h-5 w-5" />
                                            </div>
                                            <span className="text-xs">Tap to upload logo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Event Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Event Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Meta Ads Q1 2024"
                                    required
                                    className="h-11"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Add a brief description..."
                                    className="min-h-[100px] resize-none"
                                />
                            </div>

                            {/* Batches (Initial) */}
                            <div className="rounded-lg bg-blue-50 p-4">
                                <p className="text-xs text-blue-600">
                                    <strong>Note:</strong> You can add batches to this event after creating it.
                                </p>
                            </div>

                            {/* Submit Button */}
                            <Button type="submit" className="h-11 w-full text-base" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Event"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
