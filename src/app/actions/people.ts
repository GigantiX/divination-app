'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Types ──────────────────────────────────────────────

export interface PeopleMember {
    id: string
    name: string
    username: string
    emoji: string
    role: 'developer' | 'admin' | 'user'
    eventsCount: number
    status: 'admin' | 'developer' | 'assigned' | 'unassigned'
}

export interface PeopleListResult {
    members?: PeopleMember[]
    error?: string
}

export interface UserDetailAssignment {
    id: string
    eventId: string
    eventName: string
    eventLogoUrl: string | null
    role: 'pic' | 'advertiser'
}

export interface UserDetailData {
    id: string
    name: string
    username: string
    emoji: string
    role: 'developer' | 'admin' | 'user'
    assignments: UserDetailAssignment[]
}

export interface UserDetailResult {
    user?: UserDetailData
    error?: string
}

export interface AssignableEvent {
    id: string
    name: string
    logoUrl: string | null
    picCount: number
    advertiserCount: number
}

export interface AssignableEventsResult {
    events?: AssignableEvent[]
    userName?: string
    error?: string
}

export interface ActionResult {
    success?: boolean
    error?: string
}

// ─── Helpers ────────────────────────────────────────────

async function requireAdminOrDev(): Promise<{ userId: string } | { error: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
        return { error: 'Tidak memiliki akses' }
    }

    return { userId: session.user.id }
}

// ─── Actions ────────────────────────────────────────────

/**
 * Fetch all users for the People list page (Admin/Developer only).
 * Returns each user with their event assignment count and status.
 */
export async function getPeopleList(): Promise<PeopleListResult> {
    const access = await requireAdminOrDev()
    if ('error' in access) return { error: access.error }

    const supabase = createAdminClient()

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, emoji, role')
        .order('full_name', { ascending: true })

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return { error: 'Gagal memuat data pengguna' }
    }

    if (!profiles || profiles.length === 0) {
        return { members: [] }
    }

    // Fetch assignment counts in a single query
    const { data: assignments } = await supabase
        .from('event_assignments')
        .select('user_id')

    // Count assignments per user
    const assignmentCounts = new Map<string, number>()
    if (assignments) {
        for (const a of assignments) {
            assignmentCounts.set(a.user_id, (assignmentCounts.get(a.user_id) || 0) + 1)
        }
    }

    const members: PeopleMember[] = profiles.map((p) => {
        const eventsCount = assignmentCounts.get(p.id) || 0
        let status: PeopleMember['status']

        if (p.role === 'admin') {
            status = 'admin'
        } else if (p.role === 'developer') {
            status = 'developer'
        } else if (eventsCount > 0) {
            status = 'assigned'
        } else {
            status = 'unassigned'
        }

        return {
            id: p.id,
            name: p.full_name,
            username: p.username,
            emoji: p.emoji || '👤',
            role: p.role as PeopleMember['role'],
            eventsCount,
            status,
        }
    })

    return { members }
}

/**
 * Fetch detailed user info including event assignments (Admin/Developer only).
 */
export async function getUserDetail(userId: string): Promise<UserDetailResult> {
    const access = await requireAdminOrDev()
    if ('error' in access) return { error: access.error }

    const supabase = createAdminClient()

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, emoji, role')
        .eq('id', userId)
        .single()

    if (profileError || !profile) {
        return { error: 'Pengguna tidak ditemukan' }
    }

    // Fetch assignments with event info
    const { data: assignments } = await supabase
        .from('event_assignments')
        .select('id, role, event_id, events:events(id, name, logo_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    const mappedAssignments: UserDetailAssignment[] = (assignments || []).map((a) => {
        const event = a.events as unknown as { id: string; name: string; logo_url: string | null }
        return {
            id: a.id,
            eventId: event?.id || a.event_id,
            eventName: event?.name || 'Unknown Event',
            eventLogoUrl: event?.logo_url || null,
            role: a.role as 'pic' | 'advertiser',
        }
    })

    return {
        user: {
            id: profile.id,
            name: profile.full_name,
            username: profile.username,
            emoji: profile.emoji || '👤',
            role: profile.role as UserDetailData['role'],
            assignments: mappedAssignments,
        },
    }
}

/**
 * Fetch events the user is NOT yet assigned to (Admin/Developer only).
 * Used in the assignment page.
 */
export async function getAssignableEvents(userId: string): Promise<AssignableEventsResult> {
    const access = await requireAdminOrDev()
    if ('error' in access) return { error: access.error }

    const supabase = createAdminClient()

    // Get user name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()

    if (!profile) {
        return { error: 'Pengguna tidak ditemukan' }
    }

    // Get user's existing assignments
    const { data: existingAssignments } = await supabase
        .from('event_assignments')
        .select('event_id')
        .eq('user_id', userId)

    const assignedEventIds = new Set((existingAssignments || []).map((a) => a.event_id))

    // Get all active events
    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, logo_url')
        .eq('status', 'active')
        .order('name', { ascending: true })

    if (eventsError) {
        console.error('Error fetching events:', eventsError)
        return { error: 'Gagal memuat data event' }
    }

    // Filter out already-assigned events
    const availableEvents = (events || []).filter((e) => !assignedEventIds.has(e.id))

    // Get team counts for available events
    const { data: allAssignments } = await supabase
        .from('event_assignments')
        .select('event_id, role')

    const picCounts = new Map<string, number>()
    const advCounts = new Map<string, number>()
    if (allAssignments) {
        for (const a of allAssignments) {
            if (a.role === 'pic') {
                picCounts.set(a.event_id, (picCounts.get(a.event_id) || 0) + 1)
            } else if (a.role === 'advertiser') {
                advCounts.set(a.event_id, (advCounts.get(a.event_id) || 0) + 1)
            }
        }
    }

    const assignableEvents: AssignableEvent[] = availableEvents.map((e) => ({
        id: e.id,
        name: e.name,
        logoUrl: e.logo_url,
        picCount: picCounts.get(e.id) || 0,
        advertiserCount: advCounts.get(e.id) || 0,
    }))

    return { events: assignableEvents, userName: profile.full_name }
}

/**
 * Assign a user to an event with a specific role (Admin/Developer only).
 */
export async function assignUserToEvent(
    userId: string,
    eventId: string,
    role: 'pic' | 'advertiser'
): Promise<ActionResult> {
    const access = await requireAdminOrDev()
    if ('error' in access) return { error: access.error }

    const supabase = createAdminClient()

    // Verify user exists
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .single()

    if (!profile) {
        return { error: 'Pengguna tidak ditemukan' }
    }

    // Admin/Developer don't need event assignments (they see all events)
    if (profile.role === 'admin' || profile.role === 'developer') {
        return { error: 'Admin dan Developer sudah memiliki akses ke semua event' }
    }

    // Verify event exists
    const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single()

    if (!event) {
        return { error: 'Event tidak ditemukan' }
    }

    // Check for existing assignment
    const { data: existing } = await supabase
        .from('event_assignments')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle()

    if (existing) {
        return { error: 'Pengguna sudah ditugaskan ke event ini' }
    }

    // Create assignment
    const { error } = await supabase
        .from('event_assignments')
        .insert({
            event_id: eventId,
            user_id: userId,
            role,
        })

    if (error) {
        console.error('Error assigning user:', error)
        return { error: 'Gagal menugaskan pengguna' }
    }

    revalidatePath('/people')
    revalidatePath(`/people/${userId}`)
    revalidatePath(`/events/${eventId}`)

    return { success: true }
}

/**
 * Revoke a user's event assignment (Admin/Developer only).
 */
export async function revokeAssignment(assignmentId: string): Promise<ActionResult> {
    const access = await requireAdminOrDev()
    if ('error' in access) return { error: access.error }

    const supabase = createAdminClient()

    // Get assignment details for revalidation
    const { data: assignment } = await supabase
        .from('event_assignments')
        .select('user_id, event_id')
        .eq('id', assignmentId)
        .single()

    if (!assignment) {
        return { error: 'Penugasan tidak ditemukan' }
    }

    const { error } = await supabase
        .from('event_assignments')
        .delete()
        .eq('id', assignmentId)

    if (error) {
        console.error('Error revoking assignment:', error)
        return { error: 'Gagal mencabut penugasan' }
    }

    revalidatePath('/people')
    revalidatePath(`/people/${assignment.user_id}`)
    revalidatePath(`/events/${assignment.event_id}`)

    return { success: true }
}

/**
 * Update a user's global role (Admin/Developer only).
 * Only developers can promote/demote between admin and user.
 */
export async function updateUserRole(
    userId: string,
    newRole: 'admin' | 'user'
): Promise<ActionResult> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Only developers can change roles
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!currentUserProfile || currentUserProfile.role !== 'developer') {
        return { error: 'Hanya Developer yang dapat mengubah role pengguna' }
    }

    // Prevent self-demotion
    if (userId === session.user.id) {
        return { error: 'Tidak dapat mengubah role sendiri' }
    }

    // Check target user exists and is not a developer
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

    if (!targetProfile) {
        return { error: 'Pengguna tidak ditemukan' }
    }

    if (targetProfile.role === 'developer') {
        return { error: 'Tidak dapat mengubah role Developer' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

    if (error) {
        console.error('Error updating role:', error)
        return { error: 'Gagal mengubah role pengguna' }
    }

    revalidatePath('/people')
    revalidatePath(`/people/${userId}`)

    return { success: true }
}
