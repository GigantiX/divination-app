import type { ConnectionProfile } from '@/lib/integrations/types'

export function ConnectionProfileDetails({ profile }: { profile: ConnectionProfile }) {
    const fields = [
        ['Nama akun', profile.name], ['Email', profile.email],
        ['Username / toko', profile.username], ['Role OrderOnline', profile.role],
        ['Status akun', profile.is_active === null ? null : profile.is_active ? 'Aktif' : 'Tidak aktif'],
        ['Paket', profile.package], ['Masa aktif paket', profile.expired_date],
    ]
    return (
        <dl className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background-secondary p-4 sm:grid-cols-2">
            {fields.map(([label, value]) => (
                <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium">{value || '—'}</dd>
                </div>
            ))}
        </dl>
    )
}
