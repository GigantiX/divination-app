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
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = profile.role === 'admin' || profile.role === 'developer'

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
        const { data: assignment } = await supabase
            .from('event_assignments')
            .select('role')
            .eq('event_id', batch.event_id)
            .eq('user_id', session.user.id)
            .single()

        if (!assignment || assignment.role !== 'advertiser') {
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
            profiles:profiles(full_name, emoji)
        `)
        .eq('id', reportId)
        .single()

    if (error || !data) {
        return null
    }

    return data
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
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = profile.role === 'admin' || profile.role === 'developer'
    const isOwner = report.user_id === session.user.id

    if (!isAdminOrDev && !isOwner) {
        return { error: 'Tidak memiliki akses untuk mengedit laporan ini' }
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

    const batchData = report.batches as unknown as { event_id: string } | null
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
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = profile.role === 'admin' || profile.role === 'developer'
    const isOwner = report.user_id === session.user.id

    if (!isAdminOrDev && !isOwner) {
        return { error: 'Tidak memiliki akses' }
    }

    const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

    if (error) {
        console.error('Error deleting report:', error)
        return { error: 'Gagal menghapus laporan' }
    }

    const batchData = report.batches as unknown as { event_id: string } | null
    if (batchData) {
        revalidatePath(`/events/${batchData.event_id}`)
    }

    return { success: true }
}
