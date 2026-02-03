"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, Calendar, DollarSign, Users, ShoppingCart, FileText, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type DateOption = "today" | "yesterday" | "custom"

// Get today's date in Jakarta timezone (UTC+7)
const getJakartaDate = () => {
    const now = new Date()
    const jakartaOffset = 7 * 60 // UTC+7 in minutes
    const localOffset = now.getTimezoneOffset()
    const jakartaTime = new Date(now.getTime() + (jakartaOffset + localOffset) * 60 * 1000)
    return jakartaTime.toISOString().split('T')[0]
}

const getYesterdayDate = () => {
    const today = new Date(getJakartaDate())
    today.setDate(today.getDate() - 1)
    return today.toISOString().split('T')[0]
}

export default function NewReportPage() {
    const router = useRouter()
    const params = useParams()
    const eventId = params.id as string

    const todayDate = getJakartaDate()
    const yesterdayDate = getYesterdayDate()

    const [isLoading, setIsLoading] = React.useState(false)
    const [dateOption, setDateOption] = React.useState<DateOption>("today")
    const [customStartDate, setCustomStartDate] = React.useState(todayDate)
    const [customEndDate, setCustomEndDate] = React.useState(todayDate)

    const [formData, setFormData] = React.useState({
        spend: "",
        leads: "",
        sales: "",
        notes: ""
    })

    const getDateRange = () => {
        switch (dateOption) {
            case "today":
                return { start: todayDate, end: todayDate }
            case "yesterday":
                return { start: yesterdayDate, end: yesterdayDate }
            case "custom":
                return { start: customStartDate, end: customEndDate }
        }
    }

    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const dateRange = getDateRange()
        console.log("Submitting report for:", dateRange)

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500))

        setIsLoading(false)
        router.push(`/events/${eventId}`)
    }

    const formatCurrency = (value: string) => {
        const num = value.replace(/\D/g, '')
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }

    const handleSpendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCurrency(e.target.value)
        setFormData(prev => ({ ...prev, spend: formatted }))
    }

    const dateRange = getDateRange()

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
                        Add New Report
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:p-6 md:max-w-2xl md:mx-auto md:w-full">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Date Selection */}
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    Report Date
                                </Label>

                                {/* Date Chips */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDateOption("today")}
                                        className={cn(
                                            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                                            dateOption === "today"
                                                ? "bg-primary text-white shadow-sm"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        Today
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateOption("yesterday")}
                                        className={cn(
                                            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                                            dateOption === "yesterday"
                                                ? "bg-primary text-white shadow-sm"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        Yesterday
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateOption("custom")}
                                        className={cn(
                                            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                                            dateOption === "custom"
                                                ? "bg-primary text-white shadow-sm"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        Custom
                                    </button>
                                </div>

                                {/* Custom Date Range */}
                                {dateOption === "custom" && (
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500">From</label>
                                            <Input
                                                type="date"
                                                value={customStartDate}
                                                max={todayDate}
                                                onChange={(e) => {
                                                    setCustomStartDate(e.target.value)
                                                    if (e.target.value > customEndDate) {
                                                        setCustomEndDate(e.target.value)
                                                    }
                                                }}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500">To</label>
                                            <Input
                                                type="date"
                                                value={customEndDate}
                                                min={customStartDate}
                                                max={todayDate}
                                                onChange={(e) => setCustomEndDate(e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Selected Date Display */}
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                    <p className="text-xs text-blue-600">
                                        {dateRange.start === dateRange.end
                                            ? `📅 ${formatDisplayDate(dateRange.start)}`
                                            : `📅 ${formatDisplayDate(dateRange.start)} → ${formatDisplayDate(dateRange.end)}`
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Metrics Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Performance Metrics
                                </h3>

                                {/* Spend Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="spend" className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-blue-500" />
                                        Ad Spend (IDR)
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                            Rp
                                        </span>
                                        <Input
                                            id="spend"
                                            name="spend"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={formData.spend}
                                            onChange={handleSpendChange}
                                            required
                                            className="h-12 pl-10"
                                        />
                                    </div>
                                </div>

                                {/* Leads & Sales Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Leads Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="leads" className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-violet-500" />
                                            Leads
                                        </Label>
                                        <Input
                                            id="leads"
                                            name="leads"
                                            type="number"
                                            inputMode="numeric"
                                            placeholder="0"
                                            min="0"
                                            value={formData.leads}
                                            onChange={handleChange}
                                            required
                                            className="h-12"
                                        />
                                    </div>

                                    {/* Sales Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="sales" className="flex items-center gap-2">
                                            <ShoppingCart className="h-4 w-4 text-emerald-500" />
                                            Sales
                                        </Label>
                                        <Input
                                            id="sales"
                                            name="sales"
                                            type="number"
                                            inputMode="numeric"
                                            placeholder="0"
                                            min="0"
                                            value={formData.sales}
                                            onChange={handleChange}
                                            required
                                            className="h-12"
                                        />
                                    </div>
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
                                    placeholder="Add any additional notes about today's performance..."
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="min-h-[100px] resize-none"
                                />
                            </div>

                            {/* Quick Stats Preview */}
                            {(formData.spend || formData.leads) && (
                                <div className="rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 p-4">
                                    <p className="text-xs font-semibold text-gray-600 mb-2">PREVIEW</p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500">CPL</p>
                                            <p className="text-lg font-bold text-blue-600">
                                                {formData.spend && formData.leads && parseInt(formData.leads) > 0
                                                    ? `Rp ${formatCurrency(Math.round(parseInt(formData.spend.replace(/\./g, '')) / parseInt(formData.leads)).toString())}`
                                                    : '-'
                                                }
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">Conversion Rate</p>
                                            <p className="text-lg font-bold text-emerald-500">
                                                {formData.leads && formData.sales && parseInt(formData.leads) > 0
                                                    ? `${((parseInt(formData.sales) / parseInt(formData.leads)) * 100).toFixed(1)}%`
                                                    : '-'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="h-12 w-full text-base font-semibold"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving Report...
                                    </>
                                ) : (
                                    "Save Report"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Helper Text */}
                <p className="mt-4 text-center text-xs text-gray-400">
                    Reports are saved to the current batch automatically
                </p>
            </div>
        </div>
    )
}
