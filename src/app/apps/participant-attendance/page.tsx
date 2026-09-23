import { redirect } from 'next/navigation'

import { getProfile } from '@/app/actions/profile'

import { ParticipantAttendanceClient } from './participant-attendance-client'

export const metadata = {
    title: 'Participant Attendance - Divination',
    description: 'Import peserta dan catat kehadiran event.',
}

export default async function ParticipantAttendancePage() {
    const profile = await getProfile()
    if (!profile) redirect('/login')

    return <ParticipantAttendanceClient profile={profile} />
}
