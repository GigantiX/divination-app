'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/auth'
import { getOrderOnlineCsvDownloads } from '@/app/actions/orderonline'
import { getEventAccess, getUserRole, isAdminOrDeveloper } from '@/lib/authorization'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_IMPORT_ROWS = 5_000
const PAGE_SIZE = 100

export type AttendanceEvent = {
    id: string
    name: string
    status: 'active' | 'completed' | 'upcoming'
}

export type AttendanceParticipant = {
    checkedInAt: string | null
    displayName: string
    email: string | null
    id: string
    orderNumber: string | null
    phone: string | null
    productName: string | null
    ticketCode: string | null
}

export type AttendanceDashboard = {
    checkedInCount: number
    event: AttendanceEvent
    imports: Array<{
        createdAt: string
        filename: string
        id: string
        rowsImported: number
        rowsSkipped: number
    }>
    participants: AttendanceParticipant[]
    totalCount: number
}

export type AttendanceImportResult = {
    imported: number
    skipped: number
    sourceColumns?: string[]
}

type MappedParticipant = {
    displayName: string
    email: string | null
    orderNumber: string | null
    phone: string | null
    productName: string | null
    sourceIdentity: string
    ticketCode: string | null
}

function cleanText(value: string | undefined, maxLength = 240): string | null {
    const cleaned = value?.replace(/\s+/g, ' ').trim().slice(0, maxLength) ?? ''
    return cleaned || null
}

function runnerConfiguration() {
    const baseUrl = process.env.ORDERONLINE_RUNNER_URL?.replace(/\/+$/, '')
    const token = process.env.ORDERONLINE_RUNNER_API_TOKEN?.trim()
    if (!baseUrl || !token) return null

    try {
        const url = new URL(baseUrl)
        return url.protocol === 'https:' ? { baseUrl, token } : null
    } catch {
        return null
    }
}

function normalizedHeader(value: string): string {
    return value
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

function normalizedPhone(value: string | null): string | null {
    if (!value) return null
    let phone = value.replace(/[^0-9+]/g, '')
    if (phone.startsWith('+62')) phone = `62${phone.slice(3)}`
    if (phone.startsWith('0')) phone = `62${phone.slice(1)}`
    phone = phone.replace(/\D/g, '')
    return phone.length >= 8 ? phone.slice(0, 30) : null
}

function normalizedEmail(value: string | null): string | null {
    if (!value) return null
    const email = value.trim().toLowerCase().slice(0, 240)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function detectDelimiter(content: string): ',' | ';' | '\t' {
    const firstLine = content.split(/\r?\n/, 1)[0] ?? ''
    const scores = new Map<',' | ';' | '\t', number>([[',', 0], [';', 0], ['\t', 0]])
    let quoted = false

    for (let index = 0; index < firstLine.length; index += 1) {
        const character = firstLine[index]
        if (character === '"') {
            if (quoted && firstLine[index + 1] === '"') index += 1
            else quoted = !quoted
        } else if (!quoted && (character === ',' || character === ';' || character === '\t')) {
            scores.set(character, (scores.get(character) ?? 0) + 1)
        }
    }

    return [...scores.entries()].reduce((best, current) => current[1] > best[1] ? current : best)[0]
}

function parseCsv(content: string): string[][] {
    const delimiter = detectDelimiter(content)
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentCell = ''
    let quoted = false

    for (let index = 0; index < content.length; index += 1) {
        const character = content[index]
        if (character === '"') {
            if (quoted && content[index + 1] === '"') {
                currentCell += '"'
                index += 1
            } else {
                quoted = !quoted
            }
        } else if (!quoted && character === delimiter) {
            currentRow.push(currentCell)
            currentCell = ''
        } else if (!quoted && (character === '\n' || character === '\r')) {
            if (character === '\r' && content[index + 1] === '\n') index += 1
            currentRow.push(currentCell)
            if (currentRow.some((cell) => cell.trim())) rows.push(currentRow)
            currentRow = []
            currentCell = ''
        } else {
            currentCell += character
        }
    }

    currentRow.push(currentCell)
    if (currentRow.some((cell) => cell.trim())) rows.push(currentRow)
    return rows
}

function findColumn(headers: string[], aliases: string[]): number {
    return headers.findIndex((header) => aliases.includes(header))
}

function cellAt(row: string[], index: number): string | undefined {
    return index >= 0 ? row[index] : undefined
}

function mapParticipants(content: string, importId: string): { columns: string[]; participants: MappedParticipant[]; received: number; skipped: number } | { columns: string[]; error: string } {
    const rows = parseCsv(content)
    if (rows.length < 2) return { columns: rows[0]?.map(normalizedHeader) ?? [], error: 'CSV harus memiliki baris judul dan setidaknya satu peserta.' }

    const headers = rows[0].map(normalizedHeader)
    const nameIndex = findColumn(headers, ['name', 'nama', 'full name', 'fullname', 'customer name', 'buyer name', 'nama customer', 'nama pembeli'])
    if (nameIndex < 0) {
        return { columns: headers, error: 'Kolom nama peserta belum dikenali. Gunakan salah satu: Name, Nama, atau Customer Name.' }
    }

    const emailIndex = findColumn(headers, ['email', 'email address', 'e mail', 'customer email'])
    const phoneIndex = findColumn(headers, ['phone', 'phone number', 'telephone', 'tel', 'whatsapp', 'whatsapp number', 'no hp', 'nohp', 'nomor hp', 'nomor telepon', 'no telepon'])
    const ticketIndex = findColumn(headers, ['ticket code', 'ticket id', 'ticket number', 'kode tiket', 'kode registrasi', 'registration code', 'registration id'])
    const orderIndex = findColumn(headers, ['order number', 'order id', 'order code', 'invoice', 'invoice number', 'nomor pesanan', 'nomor order'])
    const productIndex = findColumn(headers, ['product', 'product name', 'nama produk', 'item', 'package', 'produk'])
    const receivedRows = rows.slice(1, MAX_IMPORT_ROWS + 1)
    const participantsByIdentity = new Map<string, MappedParticipant>()
    let skipped = Math.max(0, rows.length - 1 - receivedRows.length)

    receivedRows.forEach((row, rowIndex) => {
        const displayName = cleanText(cellAt(row, nameIndex))
        if (!displayName) {
            skipped += 1
            return
        }

        const email = normalizedEmail(cleanText(cellAt(row, emailIndex)))
        const phone = normalizedPhone(cleanText(cellAt(row, phoneIndex)))
        const ticketCode = cleanText(cellAt(row, ticketIndex), 120)
        const orderNumber = cleanText(cellAt(row, orderIndex), 120)
        const productName = cleanText(cellAt(row, productIndex))
        const sourceIdentity = ticketCode
            ? `ticket:${ticketCode.toLowerCase()}`
            : email
                ? `email:${email}`
                : phone
                    ? `phone:${phone}`
                    : orderNumber
                        ? `order:${orderNumber.toLowerCase()}|name:${displayName.toLowerCase()}`
                        : `import:${importId}:row:${rowIndex + 1}`

        if (participantsByIdentity.has(sourceIdentity)) skipped += 1
        participantsByIdentity.set(sourceIdentity, { displayName, email, orderNumber, phone, productName, sourceIdentity, ticketCode })
    })

    return {
        columns: headers,
        participants: [...participantsByIdentity.values()],
        received: receivedRows.length,
        skipped,
    }
}

async function requireEventAccess(eventId: string) {
    if (!UUID_PATTERN.test(eventId)) return { error: 'Event tidak valid' as const }
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' as const }

    const supabase = createAdminClient()
    const access = await getEventAccess(supabase, session.user.id, eventId)
    if (!access) return { error: 'Anda tidak memiliki akses ke event ini' as const }
    return { access, session, supabase }
}

export async function getAttendanceEvents(): Promise<{ data?: AttendanceEvent[]; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    const supabase = createAdminClient()
    const role = await getUserRole(supabase, session.user.id)
    if (!role) return { error: 'Profil tidak ditemukan' }

    try {
        if (isAdminOrDeveloper(role)) {
            const { data, error } = await supabase
                .from('events')
                .select('id, name, status')
                .order('created_at', { ascending: false })
            if (error) throw error
            return { data: (data ?? []) as AttendanceEvent[] }
        }

        const { data, error } = await supabase
            .from('event_assignments')
            .select('events!inner(id, name, status)')
            .eq('user_id', session.user.id)
        if (error) throw error

        const events = (data ?? [])
            .map((assignment: { events: unknown }) => assignment.events)
            .filter((event): event is AttendanceEvent => Boolean(event && typeof event === 'object'))
        return { data: events }
    } catch (error) {
        console.error('getAttendanceEvents failed:', error)
        return { error: 'Gagal memuat daftar event.' }
    }
}

export async function getAttendanceDashboard(eventId: string, search = ''): Promise<{ data?: AttendanceDashboard; error?: string }> {
    const authorization = await requireEventAccess(eventId)
    if ('error' in authorization) return { error: authorization.error }

    const safeSearch = search.trim().replace(/[(),]/g, '').slice(0, 80)
    try {
        const participantsQuery = authorization.supabase
            .from('attendance_participants')
            .select('id, display_name, email, phone, ticket_code, order_number, product_name, attendance_checkins(checked_in_at)')
            .eq('event_id', eventId)
            .order('display_name', { ascending: true })
            .limit(PAGE_SIZE)

        if (safeSearch) {
            participantsQuery.or(`display_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,ticket_code.ilike.%${safeSearch}%`)
        }

        const [eventResult, totalResult, checkedInResult, participantsResult, importsResult] = await Promise.all([
            authorization.supabase.from('events').select('id, name, status').eq('id', eventId).single(),
            authorization.supabase.from('attendance_participants').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
            authorization.supabase.from('attendance_checkins').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
            participantsQuery,
            authorization.supabase
                .from('attendance_imports')
                .select('id, filename, rows_imported, rows_skipped, created_at')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })
                .limit(4),
        ])

        if (eventResult.error || !eventResult.data || participantsResult.error || importsResult.error) {
            throw eventResult.error ?? participantsResult.error ?? importsResult.error
        }

        const participants = (participantsResult.data ?? []).map((participant: Record<string, unknown>) => {
            const checkins = Array.isArray(participant.attendance_checkins) ? participant.attendance_checkins : []
            const firstCheckin = checkins[0] as { checked_in_at?: string } | undefined
            return {
                checkedInAt: firstCheckin?.checked_in_at ?? null,
                displayName: String(participant.display_name ?? ''),
                email: typeof participant.email === 'string' ? participant.email : null,
                id: String(participant.id),
                orderNumber: typeof participant.order_number === 'string' ? participant.order_number : null,
                phone: typeof participant.phone === 'string' ? participant.phone : null,
                productName: typeof participant.product_name === 'string' ? participant.product_name : null,
                ticketCode: typeof participant.ticket_code === 'string' ? participant.ticket_code : null,
            } satisfies AttendanceParticipant
        })

        return {
            data: {
                checkedInCount: checkedInResult.count ?? 0,
                event: eventResult.data as AttendanceEvent,
                imports: (importsResult.data ?? []).map((item) => ({
                    createdAt: item.created_at,
                    filename: item.filename,
                    id: item.id,
                    rowsImported: item.rows_imported,
                    rowsSkipped: item.rows_skipped,
                })),
                participants,
                totalCount: totalResult.count ?? 0,
            },
        }
    } catch (error) {
        console.error('getAttendanceDashboard failed:', error)
        return { error: 'Gagal memuat roster peserta.' }
    }
}

export async function importOrderOnlineAttendanceCsv(eventId: string, downloadId: string): Promise<{ data?: AttendanceImportResult; error?: string }> {
    const authorization = await requireEventAccess(eventId)
    if ('error' in authorization) return { error: authorization.error }

    const downloadsResult = await getOrderOnlineCsvDownloads()
    const download = downloadsResult.data?.find((candidate) => candidate.id === downloadId)
    if (!download) return { error: downloadsResult.error ?? 'CSV tidak ditemukan atau sudah kedaluwarsa.' }

    const { data: connection } = await authorization.supabase
        .from('orderonline_connections')
        .select('id')
        .eq('user_id', authorization.session.user.id)
        .maybeSingle()
    const runner = runnerConfiguration()
    if (!connection || !runner) return { error: 'Koneksi OrderOnline belum siap. Hubungkan akun lalu coba lagi.' }

    let csvContent: string
    try {
        const response = await fetch(`${runner.baseUrl}/api/v1/connections/${connection.id}/downloads/${downloadId}`, {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${runner.token}` },
        })
        if (!response.ok) return { error: 'CSV tidak ditemukan atau sudah kedaluwarsa.' }
        csvContent = await response.text()
        if (!csvContent || csvContent.length > 10 * 1024 * 1024) return { error: 'CSV kosong atau terlalu besar.' }
    } catch {
        return { error: 'Tidak dapat membaca CSV dari VPS.' }
    }

    const { data: importRecord, error: importError } = await authorization.supabase
        .from('attendance_imports')
        .insert({
            event_id: eventId,
            filename: download.filename,
            rows_received: 0,
            rows_imported: 0,
            rows_skipped: 0,
            source: 'orderonline_csv',
            source_columns: [],
            uploaded_by: authorization.session.user.id,
        })
        .select('id')
        .single()

    if (importError || !importRecord) {
        console.error('create attendance import failed:', importError)
        return { error: 'Tidak dapat menyiapkan import peserta.' }
    }

    const mapped = mapParticipants(csvContent, importRecord.id)
    if ('error' in mapped) {
        await authorization.supabase
            .from('attendance_imports')
            .update({ source_columns: mapped.columns, rows_skipped: 0 })
            .eq('id', importRecord.id)
        return { error: mapped.error }
    }

    try {
        for (let start = 0; start < mapped.participants.length; start += 250) {
            const rows = mapped.participants.slice(start, start + 250).map((participant) => ({
                display_name: participant.displayName,
                email: participant.email,
                event_id: eventId,
                last_import_id: importRecord.id,
                order_number: participant.orderNumber,
                phone: participant.phone,
                product_name: participant.productName,
                source_identity: participant.sourceIdentity,
                ticket_code: participant.ticketCode,
            }))
            const { error } = await authorization.supabase
                .from('attendance_participants')
                .upsert(rows, { onConflict: 'event_id,source_identity' })
            if (error) throw error
        }

        await authorization.supabase
            .from('attendance_imports')
            .update({
                rows_imported: mapped.participants.length,
                rows_received: mapped.received,
                rows_skipped: mapped.skipped,
                source_columns: mapped.columns,
            })
            .eq('id', importRecord.id)

        await fetch(`${runner.baseUrl}/api/v1/connections/${connection.id}/downloads/${downloadId}`, {
            method: 'DELETE',
            cache: 'no-store',
            headers: { Authorization: `Bearer ${runner.token}` },
        }).catch(() => undefined)
        revalidatePath('/apps/participant-attendance')
        return { data: { imported: mapped.participants.length, skipped: mapped.skipped, sourceColumns: mapped.columns } }
    } catch (error) {
        console.error('importOrderOnlineAttendanceCsv failed:', error)
        await authorization.supabase
            .from('attendance_imports')
            .update({ rows_received: mapped.received, rows_skipped: mapped.received })
            .eq('id', importRecord.id)
        return { error: 'Import peserta gagal. CSV tetap tersedia di VPS untuk dicoba lagi.' }
    }
}

export async function setParticipantCheckIn(participantId: string, checkedIn: boolean): Promise<{ checkedInAt?: string; error?: string }> {
    if (!UUID_PATTERN.test(participantId)) return { error: 'Peserta tidak valid' }
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    const supabase = createAdminClient()
    const { data: participant } = await supabase
        .from('attendance_participants')
        .select('id, event_id')
        .eq('id', participantId)
        .maybeSingle()
    if (!participant) return { error: 'Peserta tidak ditemukan' }

    const access = await getEventAccess(supabase, session.user.id, participant.event_id)
    if (!access) return { error: 'Anda tidak memiliki akses ke event ini' }

    try {
        if (!checkedIn) {
            const { error } = await supabase
                .from('attendance_checkins')
                .delete()
                .eq('participant_id', participantId)
            if (error) throw error
            return {}
        }

        const checkedInAt = new Date().toISOString()
        const { error } = await supabase
            .from('attendance_checkins')
            .upsert({
                checked_in_at: checkedInAt,
                checked_in_by: session.user.id,
                event_id: participant.event_id,
                participant_id: participantId,
            }, { onConflict: 'participant_id' })
        if (error) throw error
        return { checkedInAt }
    } catch (error) {
        console.error('setParticipantCheckIn failed:', error)
        return { error: 'Status kehadiran tidak dapat disimpan.' }
    }
}
