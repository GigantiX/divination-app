import { createAdminClient } from '@/lib/supabase/admin'

export type UserRole = 'developer' | 'admin' | 'user'
export type EventRole = 'pic' | 'advertiser'

type AdminClient = ReturnType<typeof createAdminClient>

export function isAdminOrDeveloper(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'developer'
}

export async function getUserRole(
    supabase: AdminClient,
    userId: string
): Promise<UserRole | null> {
    const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

    return (data?.role as UserRole | undefined) ?? null
}

export async function getEventAccess(
    supabase: AdminClient,
    userId: string,
    eventId: string
): Promise<{ userRole: UserRole; eventRole: EventRole | null } | null> {
    const userRole = await getUserRole(supabase, userId)
    if (!userRole) return null

    if (isAdminOrDeveloper(userRole)) {
        return { userRole, eventRole: null }
    }

    const eventRole = await getEventRole(supabase, userId, eventId)
    if (!eventRole) return null

    return { userRole, eventRole }
}

export async function getEventRole(
    supabase: AdminClient,
    userId: string,
    eventId: string
): Promise<EventRole | null> {
    const { data: assignment } = await supabase
        .from('event_assignments')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle()

    return (assignment?.role as EventRole | undefined) ?? null
}
