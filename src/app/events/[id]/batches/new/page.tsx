"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, Calendar, Hash, FileText, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

// Get today's date in Jakarta timezone (UTC+7)
const getJakartaDate = () => {
    const now = new Date()
    const jakartaOffset = 7 * 60 // UTC+7 in minutes
    const localOffset = now.getTimezoneOffset()
    const jakartaTime = new Date(now.getTime() + (jakartaOffset + localOffset) * 60 * 1000)
    return jakartaTime.toISOString().split('T')[0]
}

export default function NewBatchPage() {
    const router = useRouter()
    const params = useParams()
    const eventId = params.id as string

    const todayDate = getJakartaDate()

    const [isLoading, setIsLoading] = React.useState(false)
    const [formData, setFormData] = React.useState({
        name: "",
        startDate: todayDate,
        endDate: "",
        notes: ""
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500))

        setIsLoading(false)
        router.push(`/events/${eventId}`)
    }

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return "Present"
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-4">
                <div className="flex items-center">
                    <Link href={`/events/${eventId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 mr-2">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-black pr-10">
                        Add New Batch
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:p-6 md:max-w-2xl md:mx-auto md:w-full">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Batch Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-blue-500" />
                                    Batch Name
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    placeholder="e.g. Batch 13"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="h-12"
                                />
                            </div>

                            {/* Date Range Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    Batch Period
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Start Date */}
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate" className="text-xs text-gray-500">
                                            Start Date
                                        </Label>
                                        <div
                                            className="relative cursor-pointer"
                                            onClick={() => (document.getElementById('startDate') as HTMLInputElement)?.showPicker?.()}
                                        >
                                            <Input
                                                id="startDate"
                                                name="startDate"
                                                type="date"
                                                value={formData.startDate}
                                                onChange={(e) => {
                                                    handleChange(e)
                                                    if (formData.endDate && e.target.value > formData.endDate) {
                                                        setFormData(prev => ({ ...prev, endDate: "" }))
                                                    }
                                                }}
                                                required
                                                className="h-11 cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* End Date */}
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate" className="text-xs text-gray-500">
                                            End Date (Optional)
                                        </Label>
                                        <div
                                            className="relative cursor-pointer"
                                            onClick={() => (document.getElementById('endDate') as HTMLInputElement)?.showPicker?.()}
                                        >
                                            <Input
                                                id="endDate"
                                                name="endDate"
                                                type="date"
                                                value={formData.endDate}
                                                min={formData.startDate}
                                                onChange={handleChange}
                                                className="h-11 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Period Preview */}
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                    <p className="text-xs text-blue-600">
                                        📅 {formData.name || "New Batch"}: {formatDisplayDate(formData.startDate)} - {formatDisplayDate(formData.endDate)}
                                    </p>
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    Notes (Optional)
                                </Label>
                                <Textarea
                                    id="notes"
                                    name="notes"
                                    placeholder="Add any notes about this batch..."
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="min-h-[100px] resize-none"
                                />
                            </div>



                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="h-12 w-full text-base font-semibold"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Batch...
                                    </>
                                ) : (
                                    "Create Batch"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Helper Text */}
                <p className="mt-4 text-center text-xs text-gray-400">
                    New batch will be set as the active batch for this event
                </p>
            </div>
        </div>
    )
}
