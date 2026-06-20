'use server'

// =====================================================
// LEAD DATABASE — SERVER ACTIONS (Real Supabase Queries)
// =====================================================

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// --- Types ---

export type LeadEvent = {
    event_id: string
    event_name: string
    batch_id: string
    batch_name: string
    uploaded_by_name: string
    uploaded_at: string
}

export type Lead = {
    id: string
    phone: string
    primary_name: string
    aliases: string[]
    notes: string | null
    events: LeadEvent[]
    created_at: string
    updated_at: string
}

export type UploadResult = {
    total: number
    new_leads: number
    existing_leads: number
    failed: number
    failed_numbers: string[]
}

export type UploadHistoryItem = {
    id: string
    event_name: string
    batch_name: string
    total_contacts: number
    new_leads: number
    existing_leads: number
    failed: number
    uploaded_at: string
}

export type ContactInput = {
    name: string
    phone: string
}

// --- Helpers ---

function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[^0-9+]/g, '')
    if (cleaned.startsWith('+62')) {
        cleaned = '62' + cleaned.slice(3)
    } else if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1)
    }
    cleaned = cleaned.replace(/[^0-9]/g, '')
    return cleaned
}

function isValidPhone(phone: string): boolean {
    return phone.length >= 8 && /^\d+$/.test(phone)
}

// --- Server Action Functions ---

/**
 * Get events available for lead upload
 * Admin: all active events
 * User/PIC: only events they are assigned to
 */
export async function getEventsForLeadUpload(): Promise<{ data?: { id: string; name: string }[]; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    try {
        const supabase = createAdminClient()

        // Check role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        const isAdminOrDev = profile?.role === 'admin' || profile?.role === 'developer'

        if (isAdminOrDev) {
            // Admin: all active events
            const { data, error } = await supabase
                .from('events')
                .select('id, name')
                .eq('status', 'active')
                .order('name')

            if (error) throw error
            return { data: data || [] }
        } else {
            // User: only assigned events
            const { data, error } = await supabase
                .from('event_assignments')
                .select('event_id, events!inner ( id, name, status )')
                .eq('user_id', session.user.id)

            if (error) throw error

            const events = (data || [])
                .map((a: any) => a.events)
                .filter((e: any) => e && e.status === 'active')
                .map((e: any) => ({ id: e.id, name: e.name }))

            return { data: events }
        }
    } catch (err) {
        console.error('getEventsForLeadUpload error:', err)
        return { error: 'Gagal memuat daftar event' }
    }
}

/**
 * Get batches for a specific event
 */
export async function getBatchesForEvent(eventId: string): Promise<{ data?: { id: string; name: string }[]; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }
    if (!eventId) return { error: 'Event ID wajib diisi' }

    try {
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('batches')
            .select('id, name')
            .eq('event_id', eventId)
            .order('start_date', { ascending: true })

        if (error) throw error
        return { data: data || [] }
    } catch (err) {
        console.error('getBatchesForEvent error:', err)
        return { error: 'Gagal memuat daftar batch' }
    }
}

/**
 * Upload contacts to lead database
 * Core logic: normalize → validate → upsert leads → insert lead_events → record upload history
 */
export async function uploadContacts(
    contacts: ContactInput[],
    eventId: string,
    batchId: string
): Promise<{ data?: UploadResult; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }
    if (!contacts || contacts.length === 0) return { error: 'Tidak ada kontak untuk diupload' }
    if (!eventId) return { error: 'Event wajib dipilih' }
    if (!batchId) return { error: 'Batch wajib dipilih' }

    try {
        const supabase = createAdminClient()

        // Verify user has access to this event
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        const isAdminOrDev = profile?.role === 'admin' || profile?.role === 'developer'

        if (!isAdminOrDev) {
            const { data: assignment } = await supabase
                .from('event_assignments')
                .select('role')
                .eq('event_id', eventId)
                .eq('user_id', session.user.id)
                .single()

            if (!assignment) {
                return { error: 'Anda tidak memiliki akses ke event ini' }
            }
        }

        // Verify event and batch exist
        const { data: event } = await supabase.from('events').select('id').eq('id', eventId).single()
        if (!event) return { error: 'Event tidak ditemukan' }

        const { data: batch } = await supabase.from('batches').select('id').eq('id', batchId).eq('event_id', eventId).single()
        if (!batch) return { error: 'Batch tidak ditemukan atau tidak cocok dengan event' }

        // 1. Normalize and validate contacts
        const normalized = contacts.map(c => ({
            name: c.name.trim() || 'Tanpa Nama',
            phone: normalizePhone(c.phone),
        }))

        const valid = normalized.filter(c => isValidPhone(c.phone))
        const failed = normalized.filter(c => !isValidPhone(c.phone))
        const failedNumbers = failed.map(c => c.phone || '(kosong)')

        // Deduplicate within the upload (by phone)
        const uniqueMap = new Map<string, { name: string; phone: string }>()
        for (const c of valid) {
            if (!uniqueMap.has(c.phone)) {
                uniqueMap.set(c.phone, c)
            }
        }
        const uniqueContacts = Array.from(uniqueMap.values())

        // 2. Create upload record first
        const { data: uploadRecord, error: uploadError } = await supabase
            .from('lead_uploads')
            .insert({
                user_id: session.user.id,
                event_id: eventId,
                batch_id: batchId,
                total_contacts: contacts.length,
                new_leads: 0,
                existing_leads: 0,
                failed: failed.length,
            })
            .select('id')
            .single()

        if (uploadError) throw uploadError

        // 3. Process each contact
        let newLeadsCount = 0
        let existingLeadsCount = 0

        for (const contact of uniqueContacts) {
            // Check if lead already exists by phone
            const { data: existingLead } = await supabase
                .from('leads')
                .select('id')
                .eq('phone', contact.phone)
                .single()

            let leadId: string

            if (existingLead) {
                // Lead already exists
                leadId = existingLead.id
                existingLeadsCount++
            } else {
                // Create new lead
                const { data: newLead, error: insertError } = await supabase
                    .from('leads')
                    .insert({
                        phone: contact.phone,
                        primary_name: contact.name,
                    })
                    .select('id')
                    .single()

                if (insertError) {
                    // Could be a race condition duplicate — try to fetch again
                    const { data: retryLead } = await supabase
                        .from('leads')
                        .select('id')
                        .eq('phone', contact.phone)
                        .single()

                    if (retryLead) {
                        leadId = retryLead.id
                        existingLeadsCount++
                    } else {
                        // Genuine error
                        console.error('Failed to insert lead:', insertError)
                        continue
                    }
                } else {
                    leadId = newLead.id
                    newLeadsCount++
                }
            }

            // Insert lead_event junction (skip if already exists via unique constraint)
            const { error: junctionError } = await supabase
                .from('lead_events')
                .insert({
                    lead_id: leadId,
                    event_id: eventId,
                    batch_id: batchId,
                    upload_id: uploadRecord.id,
                    alias_name: contact.name,
                    uploaded_by: session.user.id,
                })

            if (junctionError) {
                // Unique constraint violation = already assigned to this event+batch
                if (junctionError.code === '23505') {
                    // Already exists, that's fine
                } else {
                    console.error('Failed to insert lead_event:', junctionError)
                }
            }
        }

        // 4. Update upload record with final counts
        await supabase
            .from('lead_uploads')
            .update({
                new_leads: newLeadsCount,
                existing_leads: existingLeadsCount,
                failed: failed.length,
            })
            .eq('id', uploadRecord.id)

        return {
            data: {
                total: contacts.length,
                new_leads: newLeadsCount,
                existing_leads: existingLeadsCount,
                failed: failed.length,
                failed_numbers: failedNumbers,
            }
        }
    } catch (err) {
        console.error('uploadContacts error:', err)
        return { error: 'Gagal mengupload kontak. Silakan coba lagi.' }
    }
}

/**
 * Get all leads with optional filters (Admin only)
 */
export async function getLeads(filters?: {
    search?: string
    eventId?: string
    batchId?: string
}): Promise<{ data?: Lead[]; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    try {
        const supabase = createAdminClient()

        // Check admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
            return { error: 'Tidak memiliki akses' }
        }

        // Build leads query
        let query = supabase
            .from('leads')
            .select('id, phone, primary_name, notes, created_at, updated_at')
            .order('updated_at', { ascending: false })

        // Apply search filter
        if (filters?.search) {
            const searchTerm = `%${filters.search}%`
            query = query.or(`primary_name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
        }

        const { data: leadsData, error: leadsError } = await query

        if (leadsError) throw leadsError
        if (!leadsData || leadsData.length === 0) return { data: [] }

        // Get all lead_events for these leads
        const leadIds = leadsData.map(l => l.id)
        const { data: leadEventsData, error: eventsError } = await supabase
            .from('lead_events')
            .select(`
                lead_id,
                event_id,
                batch_id,
                alias_name,
                created_at,
                events ( name ),
                batches ( name ),
                profiles:uploaded_by ( full_name )
            `)
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false })

        if (eventsError) throw eventsError

        // Group lead_events by lead_id
        const eventsByLeadId = new Map<string, LeadEvent[]>()
        const aliasesByLeadId = new Map<string, Set<string>>()

        for (const le of (leadEventsData || [])) {
            const leadId = le.lead_id
            const event: LeadEvent = {
                event_id: le.event_id,
                event_name: (le.events as any)?.name || '',
                batch_id: le.batch_id,
                batch_name: (le.batches as any)?.name || '',
                uploaded_by_name: (le.profiles as any)?.full_name || '',
                uploaded_at: le.created_at,
            }

            if (!eventsByLeadId.has(leadId)) {
                eventsByLeadId.set(leadId, [])
            }
            eventsByLeadId.get(leadId)!.push(event)

            if (!aliasesByLeadId.has(leadId)) {
                aliasesByLeadId.set(leadId, new Set())
            }
            aliasesByLeadId.get(leadId)!.add(le.alias_name)
        }

        // Build Lead objects
        let leads: Lead[] = leadsData.map(l => ({
            id: l.id,
            phone: l.phone,
            primary_name: l.primary_name,
            aliases: Array.from(aliasesByLeadId.get(l.id) || new Set()),
            notes: l.notes,
            events: eventsByLeadId.get(l.id) || [],
            created_at: l.created_at,
            updated_at: l.updated_at,
        }))

        // Apply event/batch filters (post-query since it depends on junction table)
        if (filters?.eventId) {
            leads = leads.filter(l =>
                l.events.some(e => e.event_id === filters.eventId)
            )
        }

        if (filters?.batchId) {
            leads = leads.filter(l =>
                l.events.some(e => e.batch_id === filters.batchId)
            )
        }

        return { data: leads }
    } catch (err) {
        console.error('getLeads error:', err)
        return { error: 'Gagal memuat data lead' }
    }
}

/**
 * Get single lead detail (Admin only)
 */
export async function getLeadDetail(leadId: string): Promise<{ data?: Lead; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }
    if (!leadId) return { error: 'Lead ID wajib diisi' }

    try {
        const supabase = createAdminClient()

        // Check admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
            return { error: 'Tidak memiliki akses' }
        }

        // Get lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('id, phone, primary_name, notes, created_at, updated_at')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) return { error: 'Lead tidak ditemukan' }

        // Get lead_events
        const { data: leadEventsData, error: eventsError } = await supabase
            .from('lead_events')
            .select(`
                event_id,
                batch_id,
                alias_name,
                created_at,
                events ( name ),
                batches ( name ),
                profiles:uploaded_by ( full_name )
            `)
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })

        if (eventsError) throw eventsError

        const aliases = new Set<string>()
        const events: LeadEvent[] = (leadEventsData || []).map((le: any) => {
            aliases.add(le.alias_name)
            return {
                event_id: le.event_id,
                event_name: le.events?.name || '',
                batch_id: le.batch_id,
                batch_name: le.batches?.name || '',
                uploaded_by_name: le.profiles?.full_name || '',
                uploaded_at: le.created_at,
            }
        })

        return {
            data: {
                id: lead.id,
                phone: lead.phone,
                primary_name: lead.primary_name,
                aliases: Array.from(aliases),
                notes: lead.notes,
                events,
                created_at: lead.created_at,
                updated_at: lead.updated_at,
            }
        }
    } catch (err) {
        console.error('getLeadDetail error:', err)
        return { error: 'Gagal memuat detail lead' }
    }
}

/**
 * Update lead notes (Admin only)
 */
export async function updateLeadNotes(leadId: string, notes: string): Promise<{ success?: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }
    if (!leadId) return { error: 'Lead ID wajib diisi' }

    try {
        const supabase = createAdminClient()

        // Check admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
            return { error: 'Tidak memiliki akses' }
        }

        const { error } = await supabase
            .from('leads')
            .update({ notes: notes || null })
            .eq('id', leadId)

        if (error) throw error
        return { success: true }
    } catch (err) {
        console.error('updateLeadNotes error:', err)
        return { error: 'Gagal menyimpan catatan' }
    }
}

/**
 * Delete lead and all associated data (Admin only)
 */
export async function deleteLead(leadId: string): Promise<{ success?: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }
    if (!leadId) return { error: 'Lead ID wajib diisi' }

    try {
        const supabase = createAdminClient()

        // Check admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
            return { error: 'Tidak memiliki akses' }
        }

        // Verify lead exists
        const { data: lead } = await supabase
            .from('leads')
            .select('id')
            .eq('id', leadId)
            .single()

        if (!lead) return { error: 'Lead tidak ditemukan' }

        // Delete lead (cascade will remove lead_events)
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', leadId)

        if (error) throw error
        return { success: true }
    } catch (err) {
        console.error('deleteLead error:', err)
        return { error: 'Gagal menghapus lead' }
    }
}

/**
 * Get upload history for current user
 */
export async function getUploadHistory(): Promise<{ data?: UploadHistoryItem[]; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    try {
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('lead_uploads')
            .select(`
                id,
                total_contacts,
                new_leads,
                existing_leads,
                failed,
                created_at,
                events ( name ),
                batches ( name )
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        const history: UploadHistoryItem[] = (data || []).map((item: any) => ({
            id: item.id,
            event_name: item.events?.name || '',
            batch_name: item.batches?.name || '',
            total_contacts: item.total_contacts,
            new_leads: item.new_leads,
            existing_leads: item.existing_leads,
            failed: item.failed,
            uploaded_at: item.created_at,
        }))

        return { data: history }
    } catch (err) {
        console.error('getUploadHistory error:', err)
        return { error: 'Gagal memuat riwayat upload' }
    }
}

/**
 * Get all events for filter dropdown (Admin only)
 */
export async function getAllEventsForFilter(): Promise<{ data?: { id: string; name: string }[]; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    try {
        const supabase = createAdminClient()

        // Check admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
            return { error: 'Tidak memiliki akses' }
        }

        const { data, error } = await supabase
            .from('events')
            .select('id, name')
            .order('name')

        if (error) throw error
        return { data: data || [] }
    } catch (err) {
        console.error('getAllEventsForFilter error:', err)
        return { error: 'Gagal memuat daftar event' }
    }
}

/**
 * Get lead stats for admin dashboard header
 */
export async function getLeadStats(): Promise<{
    data?: {
        total_leads: number
        multi_event_leads: number
        total_events: number
    }
    error?: string
}> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    try {
        const supabase = createAdminClient()

        // Check admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
            return { error: 'Tidak memiliki akses' }
        }

        // Total leads count
        const { count: totalLeads, error: countError } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })

        if (countError) throw countError

        // Multi-event leads: leads that appear in lead_events with more than 1 unique event_id
        // We get all lead_events and compute in JS since Supabase doesn't support HAVING easily
        const { data: leadEventsData, error: leError } = await supabase
            .from('lead_events')
            .select('lead_id, event_id')

        if (leError) throw leError

        const eventsByLead = new Map<string, Set<string>>()
        for (const le of (leadEventsData || [])) {
            if (!eventsByLead.has(le.lead_id)) {
                eventsByLead.set(le.lead_id, new Set())
            }
            eventsByLead.get(le.lead_id)!.add(le.event_id)
        }

        let multiEventLeads = 0
        for (const events of eventsByLead.values()) {
            if (events.size > 1) multiEventLeads++
        }

        // Total events that have at least one lead
        const uniqueEvents = new Set<string>()
        for (const le of (leadEventsData || [])) {
            uniqueEvents.add(le.event_id)
        }

        return {
            data: {
                total_leads: totalLeads || 0,
                multi_event_leads: multiEventLeads,
                total_events: uniqueEvents.size,
            }
        }
    } catch (err) {
        console.error('getLeadStats error:', err)
        return { error: 'Gagal memuat statistik lead' }
    }
}
