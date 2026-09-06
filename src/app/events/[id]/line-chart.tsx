"use client"

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ScriptableContext,
} from "chart.js"
import * as React from "react"
import { Line } from "react-chartjs-2"
import { useTheme } from "@/components/theme-provider"

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

type ChartColors = {
    foreground: string
    mutedForeground: string
    border: string
    popover: string
    leads: string
    sales: string
}

function getToken(name: string, alpha?: number) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return `hsl(${value}${alpha === undefined ? "" : ` / ${alpha}`})`
}

function createChartOptions(colors: ChartColors) {
    return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            mode: "index" as const,
            intersect: false,
            backgroundColor: colors.popover,
            titleColor: colors.foreground,
            bodyColor: colors.foreground,
            borderColor: colors.border,
            borderWidth: 1,
            padding: 10,
            displayColors: false,
        },
    },
    scales: {
        x: {
            grid: {
                display: false,
            },
            ticks: {
                color: colors.mutedForeground,
                font: {
                    size: 10,
                },
            },
        },
        y: {
            display: true,
            min: 0,
            grid: {
                color: colors.border,
            },
            ticks: {
                color: colors.mutedForeground,
                font: {
                    size: 10,
                },
            },
        },
    },
    interaction: {
        mode: "nearest" as const,
        axis: "x" as const,
        intersect: false,
    },
    }
}

interface LineChartProps {
    labels: string[]
    leadsData: number[]
    salesData: number[]
}

export default function LineChart({ labels, leadsData, salesData }: LineChartProps) {
    const { resolvedTheme } = useTheme()
    const colors = React.useMemo<ChartColors>(() => ({
        foreground: getToken("--foreground"),
        mutedForeground: getToken("--muted-foreground"),
        border: getToken("--border"),
        popover: getToken("--popover", 0.96),
        leads: getToken("--chart-leads"),
        sales: getToken("--chart-sales"),
    }), [resolvedTheme])
    const options = React.useMemo(() => createChartOptions(colors), [colors])
    const data = React.useMemo(() => ({
        labels,
        datasets: [
            {
                fill: true,
                label: "Leads",
                data: leadsData,
                borderColor: colors.leads,
                backgroundColor: (context: ScriptableContext<"line">) => {
                    const ctx = context.chart.ctx
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200)
                    gradient.addColorStop(0, getToken("--chart-leads", 0.5))
                    gradient.addColorStop(1, getToken("--chart-leads", 0))
                    return gradient
                },
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: colors.leads,
                borderWidth: 2,
            },
            {
                fill: true,
                label: "Sales",
                data: salesData,
                borderColor: colors.sales,
                backgroundColor: (context: ScriptableContext<"line">) => {
                    const ctx = context.chart.ctx
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200)
                    gradient.addColorStop(0, getToken("--chart-sales", 0.5))
                    gradient.addColorStop(1, getToken("--chart-sales", 0))
                    return gradient
                },
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: colors.sales,
                borderWidth: 2,
            },
        ],
    }), [colors, labels, leadsData, salesData])

    return <Line options={options} data={data} />
}
