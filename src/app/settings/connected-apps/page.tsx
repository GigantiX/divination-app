import { redirect } from 'next/navigation'
import { getConnectedApps } from '@/app/actions/connected-apps'
import { ConnectedAppsClient } from './connected-apps-client'

export default async function ConnectedAppsPage() {
    const result = await getConnectedApps()
    if (!result.success && result.code === 'unauthenticated') redirect('/login')
    if (!result.success && result.code === 'forbidden') redirect('/settings')
    return <ConnectedAppsClient connections={result.success ? result.data : []} loadError={result.success ? undefined : result.error} />
}
