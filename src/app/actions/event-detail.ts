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
    batchId?: string
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
                    const { data: reports } = await supabase
                        .from('reports')
                        .select('ads_spent, tax_percentage, leads_count, closing_count')
                        .eq('batch_id', currentBatchId)
                        .eq('user_id', profileData.id)

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
        const { data: allReports } = await supabase
            .from('reports')
            .select('ads_spent, tax_percentage, leads_count, closing_count')
            .eq('batch_id', currentBatchId)

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
        const { data: reportData } = await supabase
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

/**
 * Get chart data for the event (last 7 days of leads & sales)
 */
export async function getEventChartData(batchId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()

    // Get last 7 days of data
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)

    const { data: reports } = await supabase
        .from('reports')
        .select('report_date, leads_count, closing_count')
        .eq('batch_id', batchId)
        .gte('report_date', sevenDaysAgo.toISOString().split('T')[0])
        .lte('report_date', today.toISOString().split('T')[0])
        .order('report_date', { ascending: true })

    // Build day labels and data
    const labels: string[] = []
    const leadsData: number[] = []
    const salesData: number[] = []

    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo)
        date.setDate(sevenDaysAgo.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]

        labels.push(dayNames[date.getDay()])

        // Sum reports for this date
        const dayReports = (reports || []).filter((r) => r.report_date === dateStr)
        const dayLeads = dayReports.reduce((sum, r) => sum + (r.leads_count || 0), 0)
        const daySales = dayReports.reduce((sum, r) => sum + (r.closing_count || 0), 0)

        leadsData.push(dayLeads)
        salesData.push(daySales)
    }

    return {
        labels,
        leadsData,
        salesData,
        todayLeads: leadsData[leadsData.length - 1] || 0,
    }
}
