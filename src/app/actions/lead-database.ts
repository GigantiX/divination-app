'use server'

// =====================================================
// LEAD DATABASE — SERVER ACTIONS (Real Supabase Queries)
// =====================================================

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventAccess } from '@/lib/authorization'
import type { OrderOnlineLeadRow } from '@/lib/orderonline-lead-csv'

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
    orders?: LeadOrder[]
    created_at: string
    updated_at: string
}

export type LeadOrder = {
    id: string
    order_id: string
    event_id: string
    batch_id: string
    customer_name: string
    customer_email: string | null
    customer_phone: string
    address: string | null
    province: string | null
    city: string | null
    subdistrict: string | null
    zip: string | null
    product_name: string | null
    product_code: string | null
    quantity: number
    order_status: string | null
    payment_status: string | null
    payment_method: string | null
    product_price: number | null
    discount: number | null
    gross_revenue: number | null
    net_revenue: number | null
    order_created_at: string | null
    paid_at: string | null
    completed_at: string | null
    ticket_code: string | null
    attendee_name: string | null
    attendee_email: string | null
    attendee_phone: string | null
    imported_at: string
}

export type OrderImportResult = {
    total: number
    new_leads: number
    existing_leads: number
    new_orders: number
    updated_orders: number
    duplicate_rows: number
    failed: number
    failed_order_ids: string[]
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
    source: string
    new_orders: number
    updated_orders: number
    duplicate_rows: number
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

function parseOrderOnlineDate(value: string): string | null {
    if (!value.trim()) return null
    const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})\s*-\s*(\d{2}):(\d{2})$/)
    if (!match) return null
    const [, day, month, year, hour, minute] = match
    const iso = `${year}-${month}-${day}T${hour}:${minute}:00+07:00`
    const parsed = new Date(iso)
    const local = new Date(parsed.getTime() + 7 * 60 * 60 * 1000)
    if (Number.isNaN(parsed.getTime()) ||
        local.getUTCFullYear() !== Number(year) || local.getUTCMonth() + 1 !== Number(month) ||
        local.getUTCDate() !== Number(day) || local.getUTCHours() !== Number(hour) ||
        local.getUTCMinutes() !== Number(minute)) return null
    return iso
}

function parseAmount(value: string): number | null {
    if (!value.trim()) return null
    const normalized = value.trim().replace(/,/g, '')
    if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
    const amount = Number(normalized)
    return Number.isSafeInteger(amount * 100) ? amount : null
}

function optionalText(value: string, max = 500): string | null {
    return value.trim() ? value.trim().slice(0, max) : null
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

        const access = await getEventAccess(supabase, session.user.id, eventId)
        if (!access) return { error: 'Anda tidak memiliki akses ke event ini' }

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

/** Import OrderOnline orders without collapsing separate orders for the same phone. */
export async function importOrderOnlineLeads(
    rows: OrderOnlineLeadRow[],
    eventId: string,
    batchId: string
): Promise<{ data?: OrderImportResult; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 200) {
        return { error: 'Pilih CSV OrderOnline berisi 1–200 pesanan per unggahan.' }
    }
    if (!eventId || !batchId) return { error: 'Event dan batch wajib dipilih.' }

    try {
        const supabase = createAdminClient()
        const access = await getEventAccess(supabase, session.user.id, eventId)
        if (!access) return { error: 'Anda tidak memiliki akses ke event ini.' }
        const { data: batch, error: batchError } = await supabase
            .from('batches').select('id').eq('id', batchId).eq('event_id', eventId).single()
        if (batchError || !batch) return { error: 'Batch tidak cocok dengan event.' }

        // Fail before writing leads when the local migration has not been applied.
        const { error: schemaError } = await supabase.from('lead_orders').select('id').limit(1)
        if (schemaError) return { error: 'Tabel pesanan belum tersedia. Jalankan migrasi 20260925_add_lead_orders.sql dahulu.' }

        const unique = new Map<string, OrderOnlineLeadRow>()
        const failedIds: string[] = []
        let duplicateRows = 0
        for (const row of rows) {
            if (!row || typeof row !== 'object' ||
                !['order_id', 'name', 'email', 'phone', 'address', 'province', 'city', 'subdistrict',
                    'zip', 'product', 'product_code', 'quantity', 'status', 'payment_status',
                    'payment_method', 'product_price', 'discount', 'gross_revenue', 'net_revenue',
                    'created_at', 'paid_at', 'completed_at'].every(
                    key => typeof row[key as keyof OrderOnlineLeadRow] === 'string'
                )) {
                failedIds.push('(baris tidak valid)')
                continue
            }
            const orderId = row.order_id.trim()
            const phone = normalizePhone(row.phone)
            if (!orderId || orderId.length > 120 || !isValidPhone(phone) || !row.name.trim() ||
                (row.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) ||
                (row.quantity.trim() && (!/^\d+$/.test(row.quantity.trim()) || Number(row.quantity) < 1)) ||
                ['product_price', 'discount', 'gross_revenue', 'net_revenue'].some(
                    field => row[field as keyof OrderOnlineLeadRow]?.trim() && parseAmount(row[field as keyof OrderOnlineLeadRow]) === null
                ) ||
                ['created_at', 'paid_at', 'completed_at'].some(
                    field => row[field as keyof OrderOnlineLeadRow]?.trim() && parseOrderOnlineDate(row[field as keyof OrderOnlineLeadRow]) === null
                )) {
                failedIds.push(orderId || '(tanpa order_id)')
                continue
            }
            if (unique.has(orderId)) {
                duplicateRows++
                continue
            }
            unique.set(orderId, row)
        }

        if (unique.size === 0) return { error: 'Tidak ada pesanan valid. Periksa order_id, nama, telepon, email, angka, dan tanggal.' }

        const { data: upload, error: uploadError } = await supabase.from('lead_uploads').insert({
            user_id: session.user.id,
            event_id: eventId,
            batch_id: batchId,
            source: 'orderonline_csv',
            total_contacts: rows.length,
            new_leads: 0,
            existing_leads: 0,
            new_orders: 0,
            updated_orders: 0,
            duplicate_rows: duplicateRows,
            failed: failedIds.length,
        }).select('id').single()
        if (uploadError || !upload) throw uploadError || new Error('Upload record unavailable')

        let newLeads = 0
        let existingLeads = 0
        let newOrders = 0
        let updatedOrders = 0
        const leadCache = new Map<string, string>()

        for (const row of unique.values()) {
            const phone = normalizePhone(row.phone)
            const orderId = row.order_id.trim()
            try {
                // An order is assigned to one event/batch. A re-import must not silently move it.
                const { data: priorOrder, error: priorError } = await supabase.from('lead_orders')
                    .select('id, event_id, batch_id').eq('source', 'orderonline').eq('order_id', orderId).maybeSingle()
                if (priorError) throw priorError
                if (priorOrder && (priorOrder.event_id !== eventId || priorOrder.batch_id !== batchId)) {
                    failedIds.push(orderId)
                    continue
                }

                let leadId = leadCache.get(phone)
                if (!leadId) {
                    const { data: existing, error: leadReadError } = await supabase.from('leads')
                        .select('id').eq('phone', phone).maybeSingle()
                    if (leadReadError) throw leadReadError
                    if (existing) {
                        leadId = existing.id
                        existingLeads++
                    } else {
                        const { data: created, error: createError } = await supabase.from('leads')
                            .insert({ phone, primary_name: row.name.trim().slice(0, 250) })
                            .select('id').single()
                        if (createError) {
                            if (createError.code !== '23505') throw createError
                            const { data: retry, error: retryError } = await supabase.from('leads')
                                .select('id').eq('phone', phone).single()
                            if (retryError || !retry) throw retryError || createError
                            leadId = retry.id
                            existingLeads++
                        } else {
                            leadId = created.id
                            newLeads++
                        }
                    }
                    if (!leadId) throw new Error('Lead ID unavailable')
                    leadCache.set(phone, leadId)
                }

                const { error: junctionError } = await supabase.from('lead_events').insert({
                    lead_id: leadId, event_id: eventId, batch_id: batchId,
                    upload_id: upload.id, alias_name: row.name.trim().slice(0, 250),
                    uploaded_by: session.user.id,
                })
                if (junctionError && junctionError.code !== '23505') throw junctionError

                const orderValues = {
                    lead_id: leadId,
                    customer_name: row.name.trim().slice(0, 250),
                    customer_email: optionalText(row.email, 320),
                    customer_phone: phone,
                    address: optionalText(row.address, 1000),
                    province: optionalText(row.province),
                    city: optionalText(row.city),
                    subdistrict: optionalText(row.subdistrict),
                    zip: optionalText(row.zip, 30),
                    product_name: optionalText(row.product),
                    product_code: optionalText(row.product_code, 120),
                    quantity: row.quantity.trim() ? Number(row.quantity) : 1,
                    order_status: optionalText(row.status, 100),
                    payment_status: optionalText(row.payment_status, 100),
                    payment_method: optionalText(row.payment_method, 100),
                    product_price: parseAmount(row.product_price),
                    discount: parseAmount(row.discount),
                    gross_revenue: parseAmount(row.gross_revenue),
                    net_revenue: parseAmount(row.net_revenue),
                    order_created_at: parseOrderOnlineDate(row.created_at),
                    paid_at: parseOrderOnlineDate(row.paid_at),
                    completed_at: parseOrderOnlineDate(row.completed_at),
                    imported_at: new Date().toISOString(),
                }
                if (priorOrder) {
                    const { error } = await supabase.from('lead_orders').update(orderValues)
                        .eq('id', priorOrder.id).eq('event_id', eventId).eq('batch_id', batchId)
                    if (error) throw error
                    updatedOrders++
                } else {
                    const { error } = await supabase.from('lead_orders').insert({
                        ...orderValues, source: 'orderonline', order_id: orderId,
                        event_id: eventId, batch_id: batchId,
                        upload_id: upload.id, imported_by: session.user.id,
                    })
                    if (error) throw error
                    newOrders++
                }
            } catch (error) {
                console.error('importOrderOnlineLeads order failed:', error)
                failedIds.push(orderId)
            }
        }

        const { error: updateError } = await supabase.from('lead_uploads').update({
            new_leads: newLeads, existing_leads: existingLeads,
            new_orders: newOrders, updated_orders: updatedOrders,
            failed: failedIds.length,
        }).eq('id', upload.id)
        if (updateError) throw updateError

        return { data: {
            total: rows.length, new_leads: newLeads, existing_leads: existingLeads,
            new_orders: newOrders, updated_orders: updatedOrders,
            duplicate_rows: duplicateRows, failed: failedIds.length,
            failed_order_ids: failedIds,
        } }
    } catch (error) {
        console.error('importOrderOnlineLeads error:', error)
        return { error: 'Impor gagal. Periksa migrasi database dan coba lagi.' }
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

        const { data: orders, error: ordersError } = await supabase
            .from('lead_orders')
            .select('id, order_id, event_id, batch_id, customer_name, customer_email, customer_phone, address, province, city, subdistrict, zip, product_name, product_code, quantity, order_status, payment_status, payment_method, product_price, discount, gross_revenue, net_revenue, order_created_at, paid_at, completed_at, ticket_code, attendee_name, attendee_email, attendee_phone, imported_at')
            .eq('lead_id', leadId)
            .order('order_created_at', { ascending: false, nullsFirst: false })
        if (ordersError) throw ordersError

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
                orders: orders || [],
                created_at: lead.created_at,
                updated_at: lead.updated_at,
            }
        }
    } catch (err) {
        console.error('getLeadDetail error:', err)
        return { error: 'Gagal memuat detail lead' }
    }
}

/** Buyer and attendee can be different people; preserve the CSV buyer fields. */
export async function updateLeadOrderAttendee(
    orderId: string,
    values: { ticket_code: string; attendee_name: string; attendee_email: string; attendee_phone: string }
): Promise<{ success?: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }
    if (!orderId || !values ||
        ['ticket_code', 'attendee_name', 'attendee_email', 'attendee_phone'].some(
            key => typeof values[key as keyof typeof values] !== 'string'
        )) {
        return { error: 'Data peserta tidak valid.' }
    }
    const ticketCode = values.ticket_code.trim()
    const attendeeName = values.attendee_name.trim()
    const attendeeEmail = values.attendee_email.trim()
    const attendeePhone = values.attendee_phone.trim()
    if (ticketCode.length > 120 || attendeeName.length > 250 || attendeeEmail.length > 320 ||
        attendeePhone.length > 50 || (attendeeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail)) ||
        (attendeePhone && !isValidPhone(normalizePhone(attendeePhone)))) {
        return { error: 'Periksa kode tiket, nama, email, dan nomor telepon peserta.' }
    }
    try {
        const supabase = createAdminClient()
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
        if (profile?.role !== 'admin' && profile?.role !== 'developer') return { error: 'Tidak memiliki akses.' }
        const { data: updated, error } = await supabase.from('lead_orders').update({
            ticket_code: ticketCode || null,
            attendee_name: attendeeName || null,
            attendee_email: attendeeEmail || null,
            attendee_phone: attendeePhone ? normalizePhone(attendeePhone) : null,
        }).eq('id', orderId).select('id').single()
        if (error?.code === '23505') return { error: 'Kode tiket sudah digunakan oleh pesanan lain pada event ini.' }
        if (error) throw error
        if (!updated) return { error: 'Pesanan tidak ditemukan.' }
        return { success: true }
    } catch (error) {
        console.error('updateLeadOrderAttendee error:', error)
        return { error: 'Gagal menyimpan data peserta.' }
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
                source,
                new_orders,
                updated_orders,
                duplicate_rows,
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
            source: item.source,
            new_orders: item.new_orders,
            updated_orders: item.updated_orders,
            duplicate_rows: item.duplicate_rows,
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
