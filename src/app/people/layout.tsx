import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function PeopleLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    if (session.user.role !== 'admin' && session.user.role !== 'developer') {
        redirect('/dashboard')
    }

    return children
}
