'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'
import { getEventRole, getUserRole, isAdminOrDeveloper } from '@/lib/authorization'
import { getJakartaDateString } from '@/lib/date'

export interface CreateReportInput {
    batchId: string
    reportDate: string
    leadsCount: number
    closingCount: number
    adsSpent: number
    taxPercentage: number
    notes?: string
}

export interface ReportResult {
    success?: boolean
    error?: string
    reportId?: string
}

/**
 * Create a new daily report (Admin/Developer/Advertiser)
 * Validates that user has permission and report date is valid
 */
export async function createReport(input: CreateReportInput): Promise<ReportResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    if (!parseIsoDate(input.reportDate)) {
        return { error: 'Format tanggal tidak valid' }
    }
    if (
        !Number.isInteger(input.leadsCount) || input.leadsCount < 0 ||
        !Number.isInteger(input.closingCount) || input.closingCount < 0 ||
        input.closingCount > input.leadsCount ||
        !Number.isFinite(input.adsSpent) || input.adsSpent < 0
    ) {
        return { error: 'Nilai laporan tidak valid' }
    }
    if (!Number.isFinite(input.taxPercentage) || input.taxPercentage < 0 || input.taxPercentage > 100) {
        return { error: 'Persentase pajak harus antara 0-100%' }
    }

    const supabase = createAdminClient()

    // Get user profile
    const role = await getUserRole(supabase, session.user.id)
    if (!role) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = isAdminOrDeveloper(role)

    // Get batch to verify it exists and get event_id
    const { data: batch } = await supabase
        .from('batches')
        .select('id, event_id')
        .eq('id', input.batchId)
        .single()

    if (!batch) {
        return { error: 'Batch tidak ditemukan' }
    }

    // If not admin/dev, check user is advertiser for this event
    if (!isAdminOrDev) {
        const assignmentRole = await getEventRole(supabase, session.user.id, batch.event_id)

        if (assignmentRole !== 'advertiser') {
            return { error: 'Tidak memiliki akses untuk menambahkan laporan' }
        }
    }

    // Prevent future-dated reports (use Jakarta timezone)
    const today = getJakartaDateString()
    if (input.reportDate > today) {
        return { error: 'Tanggal laporan tidak boleh di masa depan' }
    }

    // Check for duplicate report (same user, same batch, same date)
    const { data: existing } = await supabase
        .from('reports')
        .select('id')
        .eq('batch_id', input.batchId)
        .eq('user_id', session.user.id)
        .eq('report_date', input.reportDate)
        .maybeSingle()

    if (existing) {
        return { error: 'Laporan untuk tanggal ini sudah ada. Silakan edit laporan yang sudah ada.' }
    }

    // Create report
    const { data: report, error } = await supabase
        .from('reports')
        .insert({
            batch_id: input.batchId,
            user_id: session.user.id,
            report_date: input.reportDate,
            leads_count: input.leadsCount,
            closing_count: input.closingCount,
            ads_spent: input.adsSpent,
            tax_percentage: input.taxPercentage,
            notes: input.notes?.trim() || null,
        })
        .select('id')
        .single()

    if (error) {
        console.error('Error creating report:', error)
        return { error: 'Gagal membuat laporan. Silakan coba lagi.' }
    }

    // Revalidate event detail page
    revalidateTag(`event-${batch.event_id}`, 'default')

    return { success: true, reportId: report.id }
}

/**
 * Create a ranged report: divides spend/leads/sales equally per day.
 * Each day in the range gets one report row. Existing dates are skipped.
 */
export interface CreateReportRangeInput {
    batchId: string
    startDate: string   // YYYY-MM-DD
    endDate: string     // YYYY-MM-DD
    totalLeadsCount: number
    totalClosingCount: number
    totalAdsSpent: number
    taxPercentage: number
    notes?: string
}

export interface RangeReportResult {
    success?: boolean
    error?: string
    created: number
    skipped: number
}

const MAX_REPORT_RANGE_DAYS = 366

function parseIsoDate(date: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
    const parsed = new Date(`${date}T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
        ? null
        : parsed
}

export async function createReportRange(input: CreateReportRangeInput): Promise<RangeReportResult> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi', created: 0, skipped: 0 }

    const start = parseIsoDate(input.startDate)
    const end = parseIsoDate(input.endDate)
    if (!start || !end) return { error: 'Format tanggal tidak valid', created: 0, skipped: 0 }
    if (start > end) return { error: 'Tanggal mulai tidak boleh setelah tanggal akhir', created: 0, skipped: 0 }

    if (
        !Number.isInteger(input.totalLeadsCount) || input.totalLeadsCount < 0 ||
        !Number.isInteger(input.totalClosingCount) || input.totalClosingCount < 0 ||
        input.totalClosingCount > input.totalLeadsCount ||
        !Number.isFinite(input.totalAdsSpent) || input.totalAdsSpent < 0
    ) {
        return { error: 'Nilai laporan tidak valid', created: 0, skipped: 0 }
    }
    if (!Number.isFinite(input.taxPercentage) || input.taxPercentage < 0 || input.taxPercentage > 100) {
        return { error: 'Persentase pajak harus antara 0-100%', created: 0, skipped: 0 }
    }

    const today = getJakartaDateString()
    if (input.endDate > today) return { error: 'Tanggal akhir tidak boleh di masa depan', created: 0, skipped: 0 }

    const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
    if (days > MAX_REPORT_RANGE_DAYS) {
        return { error: `Rentang laporan maksimal ${MAX_REPORT_RANGE_DAYS} hari`, created: 0, skipped: 0 }
    }

    const supabase = createAdminClient()

    // Auth check (same as createReport)
    const role = await getUserRole(supabase, session.user.id)
    if (!role) return { error: 'Profil tidak ditemukan', created: 0, skipped: 0 }

    const isAdminOrDev = isAdminOrDeveloper(role)

    const { data: batch } = await supabase
        .from('batches')
        .select('id, event_id')
        .eq('id', input.batchId)
        .single()

    if (!batch) return { error: 'Batch tidak ditemukan', created: 0, skipped: 0 }

    if (!isAdminOrDev) {
        const assignmentRole = await getEventRole(supabase, session.user.id, batch.event_id)
        if (assignmentRole !== 'advertiser') {
            return { error: 'Tidak memiliki akses untuk menambahkan laporan', created: 0, skipped: 0 }
        }
    }

    const dates: string[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
        dates.push(cursor.toISOString().split('T')[0])
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    // Divide spend/leads/sales equally; first day absorbs the remainder
    const baseSpend = Math.floor(input.totalAdsSpent / days)
    const baseLeads = Math.floor(input.totalLeadsCount / days)
    const baseSales = Math.floor(input.totalClosingCount / days)

    const { data: existingReports, error: existingError } = await supabase
        .from('reports')
        .select('report_date')
        .eq('batch_id', input.batchId)
        .eq('user_id', session.user.id)
        .gte('report_date', input.startDate)
        .lte('report_date', input.endDate)

    if (existingError) {
        return { error: 'Gagal memeriksa laporan yang sudah ada', created: 0, skipped: 0 }
    }

    const existingDates = new Set((existingReports || []).map((report) => report.report_date))
    const rows = []

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i]
        if (existingDates.has(date)) continue

        const isFirst = i === 0

        const daySpend  = isFirst ? input.totalAdsSpent - baseSpend * (days - 1) : baseSpend
        const dayLeads  = isFirst ? input.totalLeadsCount - baseLeads * (days - 1) : baseLeads
        // Sales per day, capped at leads per day
        const rawSales  = isFirst ? input.totalClosingCount - baseSales * (days - 1) : baseSales
        const daySales  = Math.min(rawSales, dayLeads)

        rows.push({
            batch_id: input.batchId,
            user_id: session.user.id,
            report_date: date,
            leads_count: dayLeads,
            closing_count: daySales,
            ads_spent: daySpend,
            tax_percentage: input.taxPercentage,
            notes: input.notes?.trim() || null,
        })
    }

    if (rows.length > 0) {
        const { error: insertError } = await supabase.from('reports').insert(rows)
        if (insertError) {
            console.error('Error creating range reports:', insertError)
            return { error: 'Gagal membuat laporan rentang', created: 0, skipped: existingDates.size }
        }
    }

    revalidateTag(`event-${batch.event_id}`, 'default')
    return { success: true, created: rows.length, skipped: existingDates.size }
}

/**
 * Get report by ID
 */
export async function getReport(reportId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()

    const role = await getUserRole(supabase, session.user.id)
    if (!role) {
        return null
    }

    const isAdminOrDev = isAdminOrDeveloper(role)

    const { data, error } = await supabase
        .from('reports')
        .select(`
            id,
            batch_id,
            user_id,
            report_date,
            leads_count,
            closing_count,
            ads_spent,
            tax_percentage,
            notes,
            created_at,
            profiles:profiles(full_name, emoji),
            batches:batches(event_id)
        `)
        .eq('id', reportId)
        .single()

    if (error || !data) {
        return null
    }

    if (!isAdminOrDev) {
        const batchData = data.batches as unknown as { event_id: string } | null
        if (!batchData?.event_id) {
            return null
        }

        const assignmentRole = await getEventRole(supabase, session.user.id, batchData.event_id)
        if (assignmentRole !== 'advertiser' && assignmentRole !== 'pic') {
            return null
        }
    }

    return {
        id: data.id,
        batch_id: data.batch_id,
        user_id: data.user_id,
        report_date: data.report_date,
        leads_count: data.leads_count,
        closing_count: data.closing_count,
        ads_spent: data.ads_spent,
        tax_percentage: data.tax_percentage,
        notes: data.notes,
        created_at: data.created_at,
        profiles: data.profiles,
    }
}

/**
 * Update an existing report (Admin/Developer or report owner)
 */
export async function updateReport(
    reportId: string,
    input: Partial<Omit<CreateReportInput, 'batchId'>>
): Promise<ReportResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Get report to check ownership
    const { data: report } = await supabase
        .from('reports')
        .select('user_id, batch_id, batches:batches(event_id)')
        .eq('id', reportId)
        .single()

    if (!report) {
        return { error: 'Laporan tidak ditemukan' }
    }

    // Check permissions
    const role = await getUserRole(supabase, session.user.id)
    if (!role) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = isAdminOrDeveloper(role)
    const isOwner = report.user_id === session.user.id
    const batchData = report.batches as unknown as { event_id: string } | null

    if (!batchData?.event_id) {
        return { error: 'Data event tidak ditemukan' }
    }

    if (!isAdminOrDev) {
        const assignmentRole = await getEventRole(supabase, session.user.id, batchData.event_id)
        if (assignmentRole !== 'advertiser' || !isOwner) {
            return { error: 'Tidak memiliki akses untuk mengedit laporan ini' }
        }
    }

    // Validate
    if (input.leadsCount !== undefined && input.leadsCount < 0) {
        return { error: 'Jumlah leads tidak boleh negatif' }
    }
    if (input.closingCount !== undefined && input.closingCount < 0) {
        return { error: 'Jumlah closing tidak boleh negatif' }
    }
    if (input.adsSpent !== undefined && input.adsSpent < 0) {
        return { error: 'Ad spend tidak boleh negatif' }
    }
    if (
        input.taxPercentage !== undefined &&
        (input.taxPercentage < 0 || input.taxPercentage > 100)
    ) {
        return { error: 'Persentase pajak harus antara 0-100%' }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (input.reportDate !== undefined) updateData.report_date = input.reportDate
    if (input.leadsCount !== undefined) updateData.leads_count = input.leadsCount
    if (input.closingCount !== undefined) updateData.closing_count = input.closingCount
    if (input.adsSpent !== undefined) updateData.ads_spent = input.adsSpent
    if (input.taxPercentage !== undefined) updateData.tax_percentage = input.taxPercentage
    if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null

    const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId)

    if (error) {
        console.error('Error updating report:', error)
        return { error: 'Gagal mengupdate laporan' }
    }

    if (batchData) {
        revalidateTag(`event-${batchData.event_id}`, 'default')
    }

    return { success: true, reportId }
}

/**
 * Delete a report (Admin/Developer or report owner)
 */
export async function deleteReport(reportId: string): Promise<ReportResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Get report
    const { data: report } = await supabase
        .from('reports')
        .select('user_id, batch_id, batches:batches(event_id)')
        .eq('id', reportId)
        .single()

    if (!report) {
        return { error: 'Laporan tidak ditemukan' }
    }

    // Check permissions
    const role = await getUserRole(supabase, session.user.id)
    if (!role) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = isAdminOrDeveloper(role)
    const isOwner = report.user_id === session.user.id
    const batchData = report.batches as unknown as { event_id: string } | null

    if (!batchData?.event_id) {
        return { error: 'Data event tidak ditemukan' }
    }

    if (!isAdminOrDev) {
        const assignmentRole = await getEventRole(supabase, session.user.id, batchData.event_id)
        if (assignmentRole !== 'advertiser' || !isOwner) {
            return { error: 'Tidak memiliki akses' }
        }
    }

    const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

    if (error) {
        console.error('Error deleting report:', error)
        return { error: 'Gagal menghapus laporan' }
    }

    if (batchData) {
        revalidateTag(`event-${batchData.event_id}`, 'default')
    }

    return { success: true }
}
