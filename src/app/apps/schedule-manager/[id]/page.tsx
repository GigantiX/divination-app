import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile } from '@/app/actions/profile'
import { getSchedule } from '@/app/actions/schedules'
import { NavigationLayout } from '@/components/ui/nav-layout'
import { ScheduleEditor } from '../schedule-editor'

export default async function EditSchedulePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const [profile, result] = await Promise.all([getProfile(), getSchedule(id)])
    if (!profile) redirect('/login')
    if (!result.success) return <NavigationLayout isAdmin={profile.role === 'admin' || profile.role === 'developer'}><div className="p-6"><p role="alert" className="mb-4 text-destructive">{result.error}</p><Link className="text-primary underline" href="/apps/schedule-manager">Kembali ke Schedule Manager</Link></div></NavigationLayout>
    const { schedule, canManage, eventName } = result.data
    return <ScheduleEditor key={schedule.id} profile={profile} events={[{ id: schedule.eventId, name: eventName, logoUrl: null, canManage }]} initialDocument={schedule.document} initialSchedule={schedule} canManage={canManage} />
}
