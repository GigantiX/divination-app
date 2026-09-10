'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadFile } from '@/lib/storage'
import { getEventAccess, getUserRole, isAdminOrDeveloper } from '@/lib/authorization'

const ALLOWED_PROOF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

const PROOF_EXTENSION_BY_TYPE: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}

export type BudgetRequest = {
    id: string
    user_id: string
    event_id: string
    amount: number
    status: 'process' | 'approved' | 'rejected'
    proof_image_url: string | null
    created_at: string
    event_name?: string
    user_name?: string
}

export async function getBudgetRequests(): Promise<{ data?: BudgetRequest[], error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    const supabase = createAdminClient()

    const role = await getUserRole(supabase, session.user.id)
    if (!role) return { error: 'Profil tidak ditemukan' }

    const isAdmin = isAdminOrDeveloper(role)

    let query = supabase
        .from('budget_requests')
        .select(`
            id,
            user_id,
            event_id,
            amount,
            status,
            proof_image_url,
            created_at,
            events ( name ),
            profiles ( full_name )
        `)

    if (!isAdmin) {
        query = query.eq('user_id', session.user.id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching budget requests:', error)
        return { error: 'Gagal mengambil data request budget' }
    }

    const formattedData: BudgetRequest[] = data.map((item) => ({
        ...item,
        event_name: (item.events as unknown as { name: string } | null)?.name,
        user_name: (item.profiles as unknown as { full_name: string } | null)?.full_name,
    }))

    return { data: formattedData }
}

export async function getAvailableEventsForBudget(): Promise<{ data?: { id: string, name: string }[], error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    const supabase = createAdminClient()

    const role = await getUserRole(supabase, session.user.id)
    if (!role) return { error: 'Profil tidak ditemukan' }

    if (isAdminOrDeveloper(role)) {
        const { data, error } = await supabase
            .from('events')
            .select('id, name, status')
            .eq('status', 'active')
            .order('name')
        
        if (error) return { error: 'Gagal mengambil event' }
        return { data }
    } else {
        const { data, error } = await supabase
            .from('event_assignments')
            .select(`
                event_id,
                events!inner ( id, name, status )
            `)
            .eq('user_id', session.user.id)
            .eq('events.status', 'active')

        if (error) return { error: 'Gagal mengambil event' }
        
        // Map the relation array
        const events = data.map((item) => {
            const event = item.events as unknown as { id: string; name: string }
            return { id: event.id, name: event.name }
        }).sort((a, b) => a.name.localeCompare(b.name))
        
        return { data: events }
    }
}

export async function submitBudgetRequest(eventId: string, amount: number): Promise<{ success?: boolean, error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    if (!Number.isFinite(amount) || amount <= 0) return { error: 'Jumlah budget harus lebih dari 0' }
    if (!eventId) return { error: 'Event harus dipilih' }

    const supabase = createAdminClient()

    const access = await getEventAccess(supabase, session.user.id, eventId)
    if (!access) return { error: 'Tidak memiliki akses ke event ini' }

    const { error } = await supabase
        .from('budget_requests')
        .insert({
            user_id: session.user.id,
            event_id: eventId,
            amount: amount,
            status: 'process'
        })

    if (error) {
        console.error('Error submitting request:', error)
        return { error: 'Gagal mengirim request' }
    }

    return { success: true }
}

export async function getPendingQueue(): Promise<{ data?: BudgetRequest[], error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        
    if (profile?.role !== 'admin' && profile?.role !== 'developer') {
        return { error: 'Tidak memiliki akses' }
    }

    const { data, error } = await supabase
        .from('budget_requests')
        .select(`
            id,
            user_id,
            event_id,
            amount,
            status,
            proof_image_url,
            created_at,
            events ( name ),
            profiles ( full_name )
        `)
        .eq('status', 'process')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching queue:', error)
        return { error: 'Gagal mengambil queue' }
    }

    const formattedData: BudgetRequest[] = data.map((item) => ({
        ...item,
        event_name: (item.events as unknown as { name: string } | null)?.name,
        user_name: (item.profiles as unknown as { full_name: string } | null)?.full_name,
    }))

    return { data: formattedData }
}

export async function updateRequestStatus(
    id: string, 
    status: 'approved' | 'rejected', 
    proofFileUrl?: string | null
): Promise<{ success?: boolean, error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        
    if (profile?.role !== 'admin' && profile?.role !== 'developer') {
        return { error: 'Tidak memiliki akses' }
    }

    if (status === 'approved' && !proofFileUrl) {
        return { error: 'Bukti transfer wajib diunggah untuk persetujuan' }
    }

    const updateData: { status: 'approved' | 'rejected'; proof_image_url?: string } = { status }
    if (status === 'approved' && proofFileUrl) {
        updateData.proof_image_url = proofFileUrl
    }

    const { error } = await supabase
        .from('budget_requests')
        .update(updateData)
        .eq('id', id)

    if (error) {
        console.error('Error updating status:', error)
        return { error: 'Gagal mengubah status request' }
    }

    return { success: true }
}

export async function uploadBudgetProof(formData: FormData): Promise<{ url?: string, error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    const supabase = createAdminClient()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'developer') {
        return { error: 'Tidak memiliki akses' }
    }

    const file = formData.get('file') as Blob | null
    if (!file) return { error: 'File tidak ditemukan' }

    if (!ALLOWED_PROOF_TYPES.has(file.type)) {
        return { error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.' }
    }

    if (file.size > MAX_PROOF_SIZE_BYTES) {
        return { error: 'Ukuran file terlalu besar. Maksimal 5MB.' }
    }

    const extension = PROOF_EXTENSION_BY_TYPE[file.type]
    if (!extension) {
        return { error: 'Format file tidak didukung' }
    }

    const timestamp = Date.now()
    const filename = `budget-proofs/${session.user.id}-${timestamp}.${extension}`

    const { url, error: uploadError } = await uploadFile(file, filename)
    if (uploadError || !url) return { error: uploadError || 'Gagal mengupload bukti transfer' }

    return { url }
}
