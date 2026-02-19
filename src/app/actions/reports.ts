'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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

async function getUserProfileRole(supabase: ReturnType<typeof createAdminClient>, userId: string) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

    return profile?.role ?? null
}

async function getEventAssignmentRole(
    supabase: ReturnType<typeof createAdminClient>,
    eventId: string,
    userId: string
) {
    const { data: assignment } = await supabase
        .from('event_assignments')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle()

    return assignment?.role ?? null
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

    const supabase = createAdminClient()

    // Get user profile
    const role = await getUserProfileRole(supabase, session.user.id)
    if (!role) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = role === 'admin' || role === 'developer'

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
        const assignmentRole = await getEventAssignmentRole(supabase, batch.event_id, session.user.id)

        if (assignmentRole !== 'advertiser') {
            return { error: 'Tidak memiliki akses untuk menambahkan laporan' }
        }
    }

    // Validate input
    if (!input.reportDate) {
        return { error: 'Tanggal laporan wajib diisi' }
    }

    if (input.leadsCount < 0 || input.closingCount < 0 || input.adsSpent < 0) {
        return { error: 'Nilai tidak boleh negatif' }
    }

    if (input.closingCount > input.leadsCount) {
        return { error: 'Jumlah closing tidak boleh lebih dari leads' }
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

    // Validate tax percentage
    if (input.taxPercentage < 0 || input.taxPercentage > 100) {
        return { error: 'Persentase pajak harus antara 0-100%' }
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
    revalidatePath(`/events/${batch.event_id}`)

    return { success: true, reportId: report.id }
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

    const role = await getUserProfileRole(supabase, session.user.id)
    if (!role) {
        return null
    }

    const isAdminOrDev = role === 'admin' || role === 'developer'

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

        const assignmentRole = await getEventAssignmentRole(supabase, batchData.event_id, session.user.id)
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
    const role = await getUserProfileRole(supabase, session.user.id)
    if (!role) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = role === 'admin' || role === 'developer'
    const isOwner = report.user_id === session.user.id
    const batchData = report.batches as unknown as { event_id: string } | null

    if (!batchData?.event_id) {
        return { error: 'Data event tidak ditemukan' }
    }

    if (!isAdminOrDev) {
        const assignmentRole = await getEventAssignmentRole(supabase, batchData.event_id, session.user.id)
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
        revalidatePath(`/events/${batchData.event_id}`)
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
    const role = await getUserProfileRole(supabase, session.user.id)
    if (!role) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = role === 'admin' || role === 'developer'
    const isOwner = report.user_id === session.user.id
    const batchData = report.batches as unknown as { event_id: string } | null

    if (!batchData?.event_id) {
        return { error: 'Data event tidak ditemukan' }
    }

    if (!isAdminOrDev) {
        const assignmentRole = await getEventAssignmentRole(supabase, batchData.event_id, session.user.id)
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
        revalidatePath(`/events/${batchData.event_id}`)
    }

    return { success: true }
}
