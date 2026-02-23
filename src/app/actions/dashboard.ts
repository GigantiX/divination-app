'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export interface DashboardUser {
    id: string
    displayName: string
    email: string
    emoji: string
    role: 'developer' | 'admin' | 'user'
}

export interface DashboardEvent {
    id: string
    name: string
    logo_url: string | null
    status: 'active' | 'completed' | 'upcoming'
    batchCount: number
}

export interface DashboardData {
    user: DashboardUser
    activeEvents: DashboardEvent[]
    inactiveEvents: DashboardEvent[]
}

/**
 * Get dashboard data for the current user
 * - Admin/Developer: sees all events
 * - User: sees only assigned events
 */
export async function getDashboardData(): Promise<DashboardData | null> {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, emoji, role')
        .eq('id', session.user.id)
        .single()

    if (profileError || !profile) {
        console.error('Error fetching profile:', profileError)
        return null
    }

    const user: DashboardUser = {
        id: profile.id,
        displayName: profile.full_name || profile.username,
        email: profile.username,
        emoji: profile.emoji || '😀',
        role: profile.role as 'developer' | 'admin' | 'user',
    }

    // Fetch events based on role
    let activeEvents: DashboardEvent[] = []
    let inactiveEvents: DashboardEvent[] = []

    if (user.role === 'developer' || user.role === 'admin') {
        // Admin/Developer sees all events
        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select(`
                id,
                name,
                logo_url,
                status,
                batches(id)
            `)
            .order('created_at', { ascending: false })

        if (eventsError) {
            console.error('Error fetching events:', eventsError)
        } else if (events) {
            const mappedEvents = events.map((event) => ({
                id: event.id,
                name: event.name,
                logo_url: event.logo_url,
                status: event.status as 'active' | 'completed' | 'upcoming',
                batchCount: Array.isArray(event.batches) ? event.batches.length : 0,
            }))

            activeEvents = mappedEvents.filter((e) => e.status === 'active')
            inactiveEvents = mappedEvents.filter((e) => e.status !== 'active')
        }
    } else {
        // Regular user sees only assigned events
        const { data: assignments, error: assignmentsError } = await supabase
            .from('event_assignments')
            .select(`
                event_id,
                role,
                events:events(
                    id,
                    name,
                    logo_url,
                    status,
                    batches(id)
                )
            `)
            .eq('user_id', session.user.id)

        if (assignmentsError) {
            console.error('Error fetching assignments:', assignmentsError)
        } else if (assignments) {
            const mappedEvents = assignments
                .filter((a) => a.events)
                .map((a) => {
                    // Supabase returns single object for single FK relationship
                    const event = a.events as unknown as {
                        id: string
                        name: string
                        logo_url: string | null
                        status: string
                        batches: unknown[]
                    }
                    return {
                        id: event.id,
                        name: event.name,
                        logo_url: event.logo_url,
                        status: event.status as 'active' | 'completed' | 'upcoming',
                        batchCount: Array.isArray(event.batches) ? event.batches.length : 0,
                    }
                })

            // Users only see active events (no inactive section)
            activeEvents = mappedEvents.filter((e) => e.status === 'active')
        }
    }

    return {
        user,
        activeEvents,
        inactiveEvents,
    }
}

/**
 * Toggle event status (Admin/Developer only)
 */
export async function toggleEventStatus(eventId: string, newStatus: 'active' | 'completed') {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Verify user is admin/developer
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
        return { error: 'Tidak memiliki akses' }
    }

    // Update event status
    const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId)

    if (error) {
        console.error('Error toggling event status:', error)
        return { error: 'Gagal mengubah status event' }
    }

    return { success: true }
}
