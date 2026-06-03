'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

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
            events ( name )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching budget requests:', error)
        return { error: 'Gagal mengambil data request budget' }
    }

    const formattedData = data.map((item: any) => ({
        ...item,
        event_name: item.events?.name,
    }))

    return { data: formattedData }
}

export async function getAvailableEventsForBudget(): Promise<{ data?: { id: string, name: string }[], error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (profile?.role === 'admin' || profile?.role === 'developer') {
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
        const events = data.map((item: any) => ({
            id: item.events.id,
            name: item.events.name
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))
        
        return { data: events }
    }
}

export async function submitBudgetRequest(eventId: string, amount: number): Promise<{ success?: boolean, error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi' }

    if (amount <= 0) return { error: 'Jumlah budget harus lebih dari 0' }
    if (!eventId) return { error: 'Event harus dipilih' }

    const supabase = createAdminClient()

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

    const formattedData = data.map((item: any) => ({
        ...item,
        event_name: item.events?.name,
        user_name: item.profiles?.full_name,
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

    const updateData: any = { status }
    if (status === 'approved') {
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

    const timestamp = Date.now()
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'png'
    const filename = `budget-proofs/${session.user.id}-${timestamp}.${extension}`

    const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filename, file, {
            contentType: file.type,
            upsert: false,
        })

    if (uploadError) return { error: 'Gagal mengupload bukti transfer' }

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(filename)
    return { url: urlData.publicUrl }
}
