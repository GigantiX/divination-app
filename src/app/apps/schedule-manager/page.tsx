import { redirect } from 'next/navigation'
import { getProfile } from '@/app/actions/profile'
import { getScheduleOverview } from '@/app/actions/schedules'
import { ScheduleManagerClient } from './schedule-manager-client'

export default async function ScheduleManagerPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
    const [profile, overview, query] = await Promise.all([getProfile(), getScheduleOverview(), searchParams])
    if (!profile) redirect('/login')
    return <ScheduleManagerClient profile={profile} overview={overview} selectedEventId={query.event} />
}
