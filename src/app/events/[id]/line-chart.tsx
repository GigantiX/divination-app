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
import { Line } from "react-chartjs-2"

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

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            mode: "index" as const,
            intersect: false,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            titleColor: "#000",
            bodyColor: "#000",
            borderColor: "#e5e7eb",
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
                color: "#9ca3af",
                font: {
                    size: 10,
                },
            },
        },
        y: {
            display: true,
            min: 0,
            grid: {
                color: "#f3f4f6",
            },
            ticks: {
                color: "#9ca3af",
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

interface LineChartProps {
    labels: string[]
    leadsData: number[]
    salesData: number[]
}

export default function LineChart({ labels, leadsData, salesData }: LineChartProps) {
    const data = {
        labels,
        datasets: [
            {
                fill: true,
                label: "Leads",
                data: leadsData,
                borderColor: "#3b82f6",
                backgroundColor: (context: ScriptableContext<"line">) => {
                    const ctx = context.chart.ctx
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200)
                    gradient.addColorStop(0, "rgba(59, 130, 246, 0.5)")
                    gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)")
                    return gradient
                },
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: "#3b82f6",
                borderWidth: 2,
            },
            {
                fill: true,
                label: "Sales",
                data: salesData,
                borderColor: "#10b981",
                backgroundColor: (context: ScriptableContext<"line">) => {
                    const ctx = context.chart.ctx
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200)
                    gradient.addColorStop(0, "rgba(16, 185, 129, 0.5)")
                    gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)")
                    return gradient
                },
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: "#10b981",
                borderWidth: 2,
            },
        ],
    }

    return <Line options={chartOptions} data={data} />
}
