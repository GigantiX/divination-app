import { redirect } from 'next/navigation'
import { getProfile } from '@/app/actions/profile'
import { getScheduleOverview } from '@/app/actions/schedules'
import { newScheduleDocument } from '@/lib/schedules/model'
import { ScheduleEditor } from '../schedule-editor'

export default async function NewSchedulePage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
    const [profile, overview, query] = await Promise.all([getProfile(), getScheduleOverview(), searchParams])
    if (!profile) redirect('/login')
    return <ScheduleEditor profile={profile} events={overview.success ? overview.data.events.filter(event => event.canManage) : []} initialDocument={newScheduleDocument()} defaultEventId={query.event} loadError={!overview.success ? overview.error : undefined} canManage />
}
