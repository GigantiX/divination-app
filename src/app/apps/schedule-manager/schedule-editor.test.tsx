import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ScheduleEditor } from './schedule-editor'
import { ScheduleManagerClient } from './schedule-manager-client'
import { changeScheduleStatus, deleteSchedule, duplicateSchedule, saveSchedule } from '@/app/actions/schedules'
import { newScheduleDocument } from '@/lib/schedules/model'
import type { ScheduleDocument, ScheduleRecord } from '@/lib/schedules/types'

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => navigation, usePathname: () => '/apps/schedule-manager' }))
vi.mock('@/components/ui/nav-layout', () => ({ NavigationLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }))
vi.mock('@/app/actions/schedules', () => ({ saveSchedule: vi.fn(), deleteSchedule: vi.fn(), duplicateSchedule: vi.fn(), changeScheduleStatus: vi.fn() }))
vi.mock('./schedule-preview', () => ({
    SchedulePreview: ({ document }: { document: ScheduleDocument }) => <output data-testid="preview">{document.cities.length} kota / {document.cities.reduce((total, city) => total + city.sessions.length, 0)} sesi / {document.cta.label} / {document.theme.preset} / {document.theme.accent}</output>,
    EmbedDialog: () => <div>Kode embed schedule</div>,
}))

const EVENT = '11111111-1111-4111-8111-111111111111'
const ID = '22222222-2222-4222-8222-222222222222'
const profile = { id: ID, username: 'admin', full_name: 'Admin', emoji: '', role: 'admin' }
const events = [{ id: EVENT, name: 'Seminar Properti', logoUrl: null, canManage: true }]
function record(document = newScheduleDocument(), changes: Partial<ScheduleRecord> = {}): ScheduleRecord {
    return { id: ID, eventId: EVENT, name: 'Roadshow November', document, version: 1, publishedVersion: null, publishedAt: null, updatedAt: '2026-10-31T00:00:00Z', status: 'draft', ...changes }
}
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Schedule Manager editor flow', () => {
    it('selects an existing event, names a schedule, and saves its nested form data', async () => {
        vi.mocked(saveSchedule).mockImplementation(async input => ({ success: true, data: record(input.document as ScheduleDocument, { name: input.name }) }))
        render(<ScheduleEditor profile={profile} events={events} initialDocument={newScheduleDocument()} canManage />)
        fireEvent.change(screen.getByLabelText('Event Divination'), { target: { value: EVENT } })
        fireEvent.change(screen.getByLabelText(/^Nama schedule/), { target: { value: 'Roadshow November' } })
        fireEvent.change(screen.getByLabelText(/^Kota \/ kabupaten/), { target: { value: 'Kota Malang' } })
        fireEvent.change(screen.getByLabelText(/^Tanggal seminar/), { target: { value: '2026-11-07' } })
        fireEvent.change(screen.getByLabelText('Jam mulai'), { target: { value: '14:00' } })
        fireEvent.change(screen.getByLabelText('Venue'), { target: { value: 'Hotel Malang' } })
        fireEvent.change(screen.getByLabelText(/^Link checkout OO/), { target: { value: 'https://example.orderonline.id/malang' } })
        fireEvent.click(screen.getByRole('button', { name: 'Simpan draft' }))
        await waitFor(() => expect(saveSchedule).toHaveBeenCalled())
        expect(vi.mocked(saveSchedule).mock.calls[0][0]).toMatchObject({ eventId: EVENT, name: 'Roadshow November', publish: false, document: { cities: [{ name: 'Kota Malang', province: 'Jawa Timur', sessions: [{ date: '2026-11-07', time: '14:00', venue: 'Hotel Malang', checkoutUrl: 'https://example.orderonline.id/malang' }] }] } })
        await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(`/apps/schedule-manager/${ID}`))
    })

    it('duplicates cities and sessions with their fields and updates the live preview', () => {
        const doc = newScheduleDocument(); doc.cities[0].name = 'Malang'; doc.cities[0].sessions[0].venue = 'Hotel Malang'
        render(<ScheduleEditor profile={profile} events={events} defaultEventId={EVENT} initialDocument={doc} canManage />)
        fireEvent.click(screen.getByRole('button', { name: 'Duplikat sesi 1' }))
        expect(screen.getByTestId('preview')).toHaveTextContent('1 kota / 2 sesi')
        expect(screen.getAllByLabelText('Venue').map(input => (input as HTMLInputElement).value)).toEqual(['Hotel Malang', 'Hotel Malang'])
        fireEvent.click(screen.getByRole('button', { name: 'Duplikat kota' }))
        expect(screen.getByTestId('preview')).toHaveTextContent('2 kota / 4 sesi')
    })

    it('edits CTA settings and reports publish validation failures without losing the draft', async () => {
        vi.mocked(saveSchedule).mockResolvedValue({ success: false, error: 'Isi link OO untuk sesi yang dibuka di Malang.' })
        render(<ScheduleEditor profile={profile} events={events} defaultEventId={EVENT} initialDocument={newScheduleDocument()} canManage />)
        fireEvent.change(screen.getByLabelText(/^Nama schedule/), { target: { value: 'November' } })
        fireEvent.click(screen.getByRole('tab', { name: 'Tampilan' }))
        fireEvent.change(screen.getByLabelText(/^Teks tombol default/), { target: { value: 'Daftar {city}' } })
        expect(screen.getByTestId('preview')).toHaveTextContent('Daftar {city}')
        fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
        await screen.findByRole('alert')
        expect(screen.getByRole('alert')).toHaveTextContent('Isi link OO')
        expect(screen.getByLabelText(/^Teks tombol default/)).toHaveValue('Daftar {city}')
        expect(vi.mocked(saveSchedule).mock.calls[0][0].publish).toBe(true)
    })

    it('keeps fields disabled when the editor is explicitly read-only', () => {
        const schedule = record()
        render(<ScheduleEditor profile={{ ...profile, role: 'user' }} events={events} initialDocument={schedule.document} initialSchedule={schedule} canManage={false} />)
        expect(screen.getByLabelText(/^Nama schedule/)).toBeDisabled()
        expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Simpan draft' })).not.toBeInTheDocument()
        expect(screen.getByTestId('preview')).toBeInTheDocument()
    })

    it('lets a regular account edit and delete its own schedule', async () => {
        const schedule = record()
        vi.mocked(deleteSchedule).mockResolvedValue({ success: true, data: { id: ID } })
        render(<ScheduleEditor profile={{ ...profile, role: 'user' }} events={events} initialDocument={schedule.document} initialSchedule={schedule} canManage />)
        expect(screen.getByRole('button', { name: 'Simpan draft' })).toBeEnabled()
        fireEvent.click(screen.getByRole('button', { name: 'Hapus schedule' }))
        await waitFor(() => expect(deleteSchedule).toHaveBeenCalledWith(ID, 1))
        expect(navigation.push).toHaveBeenCalledWith(`/apps/schedule-manager?event=${EVENT}`)
    })

    it('selects a structural template, customizes its color, and restores its defaults', () => {
        render(<ScheduleEditor profile={profile} events={events} defaultEventId={EVENT} initialDocument={newScheduleDocument()} canManage />)
        fireEvent.click(screen.getByRole('tab', { name: 'Tampilan' }))
        expect(screen.getAllByRole('button', { name: /^Pilih template/ })).toHaveLength(7)
        fireEvent.click(screen.getByRole('button', { name: 'Pilih template The Editorial' }))
        expect(screen.getByTestId('preview')).toHaveTextContent('editorial / #586337')
        fireEvent.change(screen.getByLabelText('Aksen & tombol'), { target: { value: '#123456' } })
        expect(screen.getByTestId('preview')).toHaveTextContent('editorial / #123456')
        fireEvent.click(screen.getByRole('button', { name: 'Reset gaya' }))
        expect(screen.getByTestId('preview')).toHaveTextContent('editorial / #586337')
    })

    it('restores an archived schedule as a draft before editing', async () => {
        const schedule = record(undefined, { status: 'archived' })
        vi.mocked(changeScheduleStatus).mockResolvedValue({ success: true, data: { ...schedule, status: 'draft', version: 2 } })
        render(<ScheduleEditor profile={profile} events={events} initialDocument={schedule.document} initialSchedule={schedule} canManage />)
        expect(screen.getByLabelText(/^Nama schedule/)).toBeDisabled()
        fireEvent.click(screen.getByRole('button', { name: 'Pulihkan draft' }))
        await waitFor(() => expect(screen.getByLabelText(/^Nama schedule/)).not.toBeDisabled())
        expect(changeScheduleStatus).toHaveBeenCalledWith(ID, 1, 'restore')
    })
})

describe('event grouping and schedule detail', () => {
    const schedule = record()
    const overview = { success: true as const, data: { events, schedules: [{ ...schedule, cityCount: 2, sessionCount: 3, cityNames: ['Malang', 'Mojokerto'] }] } }
    it('shows an empty home with a plus action instead of events without schedules', () => {
        render(<ScheduleManagerClient profile={{ ...profile, role: 'user' }} overview={{ success: true, data: { events, schedules: [] } }} />)
        expect(screen.getByText('Belum ada jadwal')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Create jadwal pertama' })).toHaveAttribute('href', '/apps/schedule-manager/new')
        expect(screen.queryByRole('link', { name: /Seminar Properti/ })).not.toBeInTheDocument()
    })
    it('hides catalog-only events and counts only supplied account-owned schedules', () => {
        const catalog = [...events, { id: ID, name: 'Seminar Lain', logoUrl: null, canManage: true }]
        render(<ScheduleManagerClient profile={profile} overview={{ ...overview, data: { ...overview.data, events: catalog } }} />)
        expect(screen.getByRole('link', { name: /Seminar Properti/ })).toHaveTextContent('1 schedule')
        expect(screen.queryByRole('link', { name: /Seminar Lain/ })).not.toBeInTheDocument()
    })
    it('shows existing events and schedule counts on the start page', () => {
        render(<ScheduleManagerClient profile={profile} overview={overview} />)
        expect(screen.getByRole('link', { name: /Seminar Properti/ })).toHaveAttribute('href', `/apps/schedule-manager?event=${EVENT}`)
        expect(screen.getByRole('link', { name: /Seminar Properti/ })).toHaveTextContent('1 schedule')
    })
    it('lists an event’s schedules and duplicates into a new editor', async () => {
        vi.mocked(duplicateSchedule).mockResolvedValue({ success: true, data: record(undefined, { id: EVENT }) })
        render(<ScheduleManagerClient profile={profile} overview={overview} selectedEventId={EVENT} />)
        expect(screen.getByText('2 kota · 3 sesi')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Duplikat' }))
        await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(`/apps/schedule-manager/${EVENT}`))
    })
})
