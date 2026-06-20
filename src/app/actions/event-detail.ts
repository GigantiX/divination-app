'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Types for Event Detail
export interface EventDetailUser {
    id: string
    name: string
    emoji: string
    role: 'pic' | 'advertiser'
}

export interface EventDetailBatch {
    id: string
    name: string
    startDate: string
    endDate: string | null // Null = ongoing batch
    price: number
}

export interface EventDetailStats {
    totalSpend: number
    totalLeads: number
    totalSales: number
    cpr: number // Cost Per Result (spend / sales)
    closingRate: number // Closing Rate %
    revenue: number // Sales × Batch Price
    profitLoss: number // Revenue - Spend
    roas: number // Return on Ad Spend (Revenue / Spend)
}

export interface EventDetailReport {
    id: string
    date: string
    spend: number
    leads: number
    sales: number
    notes: string | null
    reporter: {
        id: string
        name: string
        emoji: string
    }
}

export interface EventDetailData {
    event: {
        id: string
        name: string
        logo_url: string | null
        status: string
    }
    batches: EventDetailBatch[]
    currentBatchId: string | null
    range: DateRange
    stats: EventDetailStats
    advertisers: (EventDetailUser & {
        spend: number
        leads: number
        sales: number
        cpr: number
        closingRate: number
        revenue: number
        profitLoss: number
        roas: number
    })[]
    pics: EventDetailUser[]
    reports: EventDetailReport[]
    userRole: 'developer' | 'admin' | 'user'
    userEventRole: 'pic' | 'advertiser' | null // User's role in this event
    currentUserId: string // Current logged-in user's ID
    canManageEvent: boolean // Can add batch, edit event, etc
    canAddReport: boolean // Can submit daily reports
}

/**
 * Get detailed event data for the event detail page
 * Includes stats, team members, reports based on selected batch
 */
export async function getEventDetail(
    eventId: string,
    batchId?: string,
    range: DateRange = 'today'
): Promise<EventDetailData | null> {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()

    // Get user profile with role
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .single()

    if (!profile) {
        return null
    }

    const isAdminOrDev = profile.role === 'admin' || profile.role === 'developer'

    // Get event details
    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, logo_url, status')
        .eq('id', eventId)
        .single()

    if (eventError || !event) {
        console.error('Error fetching event:', eventError)
        return null
    }

    // Check user access to this event
    let userEventRole: 'pic' | 'advertiser' | null = null
    if (!isAdminOrDev) {
        const { data: assignment } = await supabase
            .from('event_assignments')
            .select('role')
            .eq('event_id', eventId)
            .eq('user_id', session.user.id)
            .single()

        if (!assignment) {
            // User not assigned to this event
            return null
        }
        userEventRole = assignment.role as 'pic' | 'advertiser'
    }

    // Get all batches for this event
    const { data: batches } = await supabase
        .from('batches')
        .select('id, name, start_date, end_date, price')
        .eq('event_id', eventId)
        .order('start_date', { ascending: false })

    const mappedBatches: EventDetailBatch[] = (batches || []).map((b) => ({
        id: b.id,
        name: b.name,
        startDate: b.start_date,
        endDate: b.end_date,
        price: Number(b.price || 0),
    }))

    // Determine current batch (latest or specified)
    const currentBatchId = batchId || (mappedBatches.length > 0 ? mappedBatches[0].id : null)

    // Compute date range filter for all report queries
    const dateFilter = getDateRangeFilter(range)

    // Get team assignments for this event
    const { data: assignments } = await supabase
        .from('event_assignments')
        .select(`
            role,
            user_id,
            profiles:profiles(id, full_name, emoji)
        `)
        .eq('event_id', eventId)

    const advertisers: EventDetailData['advertisers'] = []
    const pics: EventDetailUser[] = []

    // Pre-calculate the current batch price for revenue calculations
    const currentBatchPrice = mappedBatches.find(b => b.id === currentBatchId)?.price ?? 0

    if (assignments) {
        for (const a of assignments) {
            const profileData = a.profiles as unknown as { id: string; full_name: string; emoji: string } | null
            if (!profileData) continue

            const user: EventDetailUser = {
                id: profileData.id,
                name: profileData.full_name || 'Unknown',
                emoji: profileData.emoji || '😀',
                role: a.role as 'pic' | 'advertiser',
            }

            if (a.role === 'advertiser') {
                // Get advertiser stats from reports
                let advertiserStats = { spend: 0, leads: 0, sales: 0 }

                if (currentBatchId) {
                    let reportsQuery = supabase
                        .from('reports')
                        .select('ads_spent, tax_percentage, leads_count, closing_count')
                        .eq('batch_id', currentBatchId)
                        .eq('user_id', profileData.id)

                    if (dateFilter.gte) reportsQuery = reportsQuery.gte('report_date', dateFilter.gte)
                    if (dateFilter.lte) reportsQuery = reportsQuery.lte('report_date', dateFilter.lte)

                    const { data: reports } = await reportsQuery

                    if (reports) {
                        advertiserStats = reports.reduce(
                            (acc, r) => {
                                const spent = Number(r.ads_spent || 0)
                                const tax = Number(r.tax_percentage ?? 11)
                                const spendWithTax = Math.round(spent * (1 + tax / 100))
                                return {
                                    spend: acc.spend + spendWithTax,
                                    leads: acc.leads + (r.leads_count || 0),
                                    sales: acc.sales + (r.closing_count || 0),
                                }
                            },
                            { spend: 0, leads: 0, sales: 0 }
                        )
                    }
                }

                const advRevenue = advertiserStats.sales * currentBatchPrice
                const advProfitLoss = advRevenue - advertiserStats.spend

                advertisers.push({
                    ...user,
                    ...advertiserStats,
                    cpr: advertiserStats.sales > 0 ? Math.round(advertiserStats.spend / advertiserStats.sales) : 0,
                    closingRate: advertiserStats.leads > 0 ? Math.round((advertiserStats.sales / advertiserStats.leads) * 10000) / 100 : 0,
                    revenue: advRevenue,
                    profitLoss: advProfitLoss,
                    roas: advertiserStats.spend > 0 ? Math.round((advRevenue / advertiserStats.spend) * 100) / 100 : 0,
                })
            } else {
                pics.push(user)
            }
        }
    }

    // Calculate overall stats for current batch
    let stats: EventDetailStats = {
        totalSpend: 0, totalLeads: 0, totalSales: 0,
        cpr: 0, closingRate: 0, revenue: 0, profitLoss: 0, roas: 0,
    }

    if (currentBatchId) {
        let allReportsQuery = supabase
            .from('reports')
            .select('ads_spent, tax_percentage, leads_count, closing_count')
            .eq('batch_id', currentBatchId)

        if (dateFilter.gte) allReportsQuery = allReportsQuery.gte('report_date', dateFilter.gte)
        if (dateFilter.lte) allReportsQuery = allReportsQuery.lte('report_date', dateFilter.lte)

        const { data: allReports } = await allReportsQuery

        if (allReports) {
            const totals = allReports.reduce(
                (acc, r) => {
                    const spent = Number(r.ads_spent || 0)
                    const tax = Number(r.tax_percentage ?? 11)
                    const spendWithTax = Math.round(spent * (1 + tax / 100))
                    return {
                        spend: acc.spend + spendWithTax,
                        leads: acc.leads + (r.leads_count || 0),
                        sales: acc.sales + (r.closing_count || 0),
                    }
                },
                { spend: 0, leads: 0, sales: 0 }
            )

            const revenue = totals.sales * currentBatchPrice
            const profitLoss = revenue - totals.spend

            stats = {
                totalSpend: totals.spend,
                totalLeads: totals.leads,
                totalSales: totals.sales,
                cpr: totals.sales > 0 ? Math.round(totals.spend / totals.sales) : 0,
                closingRate: totals.leads > 0 ? Math.round((totals.sales / totals.leads) * 10000) / 100 : 0,
                revenue,
                profitLoss,
                roas: totals.spend > 0 ? Math.round((revenue / totals.spend) * 100) / 100 : 0,
            }
        }
    }

    // Get reports for current batch
    let reports: EventDetailReport[] = []

    if (currentBatchId) {
        let reportsQuery = supabase
            .from('reports')
            .select(`
                id,
                report_date,
                ads_spent,
                tax_percentage,
                leads_count,
                closing_count,
                notes,
                user_id,
                profiles:profiles(id, full_name, emoji)
            `)
            .eq('batch_id', currentBatchId)
            .order('report_date', { ascending: false })

        if (dateFilter.gte) reportsQuery = reportsQuery.gte('report_date', dateFilter.gte)
        if (dateFilter.lte) reportsQuery = reportsQuery.lte('report_date', dateFilter.lte)

        const { data: reportData } = await reportsQuery

        if (reportData) {
            reports = reportData.map((r) => {
                const reporter = r.profiles as unknown as { id: string; full_name: string; emoji: string } | null
                return {
                    id: r.id,
                    date: r.report_date,
                    spend: Math.round(Number(r.ads_spent || 0) * (1 + Number(r.tax_percentage ?? 11) / 100)),
                    leads: r.leads_count || 0,
                    sales: r.closing_count || 0,
                    notes: r.notes,
                    reporter: {
                        id: reporter?.id || r.user_id,
                        name: reporter?.full_name || 'Unknown',
                        emoji: reporter?.emoji || '😀',
                    },
                }
            })
        }
    }

    // Determine permissions
    const canManageEvent = isAdminOrDev || userEventRole === 'pic'
    const canAddReport = isAdminOrDev || userEventRole === 'advertiser'

    return {
        event,
        batches: mappedBatches,
        currentBatchId,
        range,
        stats,
        advertisers,
        pics,
        reports,
        currentUserId: session.user.id,
        userRole: profile.role as 'developer' | 'admin' | 'user',
        userEventRole,
        canManageEvent,
        canAddReport,
    }
}

export type DateRange = 'today' | 'yesterday' | '7d' | '30d' | 'all'

function getDateRangeFilter(range: DateRange): { gte?: string; lte?: string } {
    const now = new Date()

    const toDateString = (d: Date) => {
        const year = d.getFullYear()
        const month = `${d.getMonth() + 1}`.padStart(2, '0')
        const day = `${d.getDate()}`.padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    switch (range) {
        case 'today':
            return { gte: toDateString(now), lte: toDateString(now) }
        case 'yesterday': {
            const yesterday = new Date(now)
            yesterday.setDate(now.getDate() - 1)
            return { gte: toDateString(yesterday), lte: toDateString(yesterday) }
        }
        case '7d': {
            const start7d = new Date(now)
            start7d.setDate(now.getDate() - 6)
            return { gte: toDateString(start7d), lte: toDateString(now) }
        }
        case '30d': {
            const start30d = new Date(now)
            start30d.setDate(now.getDate() - 29)
            return { gte: toDateString(start30d), lte: toDateString(now) }
        }
        case 'all':
            return {}
    }
}

/**
 * Get chart data for the event detail chart.
 */
export async function getEventChartData(batchId: string, range: DateRange = 'today') {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()

    const today = new Date()

    const toDateString = (date: Date) => {
        const year = date.getFullYear()
        const month = `${date.getMonth() + 1}`.padStart(2, '0')
        const day = `${date.getDate()}`.padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const dateFilter = getDateRangeFilter(range)

    let reportsQuery = supabase
        .from('reports')
        .select('report_date, leads_count, closing_count')
        .eq('batch_id', batchId)
        .order('report_date', { ascending: true })

    if (dateFilter.gte) reportsQuery = reportsQuery.gte('report_date', dateFilter.gte)
    if (dateFilter.lte) reportsQuery = reportsQuery.lte('report_date', dateFilter.lte)

    const { data: reports } = await reportsQuery

    const aggregatedByDate = new Map<string, { leads: number; sales: number }>()
    for (const report of reports || []) {
        const dateKey = report.report_date
        const current = aggregatedByDate.get(dateKey) || { leads: 0, sales: 0 }
        aggregatedByDate.set(dateKey, {
            leads: current.leads + (report.leads_count || 0),
            sales: current.sales + (report.closing_count || 0),
        })
    }

    let labels: string[]
    let leadsData: number[]
    let salesData: number[]

    if (range === 'today' || range === 'yesterday') {
        const singleDate = range === 'today' ? today : (() => { const d = new Date(today); d.setDate(today.getDate() - 1); return d })()
        const dateKey = toDateString(singleDate)
        const dayData = aggregatedByDate.get(dateKey)
        labels = [range === 'today' ? 'HARI INI' : 'KEMARIN']
        leadsData = [dayData?.leads || 0]
        salesData = [dayData?.sales || 0]
    } else {
        const parseDateString = (dateStr: string) => {
            const [year, month, day] = dateStr.split('-').map(Number)
            return new Date(year, (month || 1) - 1, day || 1)
        }

        const formatLabel = (date: Date, totalDays: number) => {
            if (totalDays <= 7) {
                return date.toLocaleDateString('id-ID', { weekday: 'short' }).toUpperCase()
            }
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        }

        let startDate = new Date(today)
        let endDate = new Date(today)

        if (range === '30d') {
            startDate.setDate(today.getDate() - 29)
        } else if (range === 'all') {
            if ((reports || []).length > 0) {
                startDate = parseDateString(reports![0].report_date)
                endDate = parseDateString(reports![reports!.length - 1].report_date)
            }
        } else {
            startDate.setDate(today.getDate() - 6)
        }

        if (endDate < startDate) {
            endDate = new Date(startDate)
        }

        const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1
        labels = []
        leadsData = []
        salesData = []

        for (let i = 0; i < totalDays; i++) {
            const currentDate = new Date(startDate)
            currentDate.setDate(startDate.getDate() + i)
            const dateKey = toDateString(currentDate)
            const currentTotals = aggregatedByDate.get(dateKey)
            labels.push(formatLabel(currentDate, totalDays))
            leadsData.push(currentTotals?.leads || 0)
            salesData.push(currentTotals?.sales || 0)
        }
    }

    const todayDateKey = toDateString(today)
    const todayLeads = aggregatedByDate.get(todayDateKey)?.leads || 0

    return {
        labels,
        leadsData,
        salesData,
        todayLeads,
    }
}
