import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { deleteBatch, type EventBatchListData } from '@/app/actions/batches'
import { BatchListClient } from './batch-list-client'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh }),
}))

vi.mock('next/image', () => ({
    default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} />,
}))

vi.mock('@/app/actions/batches', () => ({
    deleteBatch: vi.fn(),
}))

vi.mock('@/components/ui/nav-layout', () => ({
    NavigationLayout: ({
        children,
        showBottomNav,
    }: {
        children: React.ReactNode
        showBottomNav?: boolean
    }) => <div data-testid="navigation-layout" data-show-bottom-nav={String(showBottomNav)}>{children}</div>,
}))

const adminData: EventBatchListData = {
    event: {
        id: 'event-1',
        name: 'Jakarta Summit',
        logoUrl: null,
        status: 'active',
    },
    activeBatches: [{
        id: 'batch-active',
        name: 'Batch September',
        startDate: '2026-09-01',
        endDate: '2026-09-09',
        price: 250000,
        notes: 'Fokus peserta Jakarta.',
        createdAt: '2026-08-20T03:00:00.000Z',
    }],
    completedBatches: [{
        id: 'batch-completed',
        name: 'Batch Agustus',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        price: 0,
        notes: null,
        createdAt: '2026-07-20T03:00:00.000Z',
    }],
    userRole: 'admin',
    userEventRole: null,
    canCreateBatch: true,
    canEditBatch: true,
    canDeleteBatch: true,
}

describe('BatchListClient', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders active and completed sections with complete batch information', () => {
        render(<BatchListClient data={adminData} />)

        expect(screen.getByRole('heading', { name: 'Batch Aktif' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Selesai' })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Batch Event' })).not.toBeInTheDocument()
        expect(screen.queryByText('Pilih periode kerja')).not.toBeInTheDocument()
        expect(screen.getByTestId('navigation-layout')).toHaveAttribute('data-show-bottom-nav', 'false')
        expect(screen.getByText('Batch September')).toBeInTheDocument()
        expect(screen.getByText('1 Sep 2026 — 9 Sep 2026')).toBeInTheDocument()
        expect(screen.getByText('Rp 250.000')).toBeInTheDocument()
        expect(screen.getByText('Fokus peserta Jakarta.')).toBeInTheDocument()
        expect(screen.getByText('Tidak ada catatan untuk batch ini.')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Buka detail Batch September' })).toHaveAttribute(
            'href',
            '/events/event-1?batch=batch-active'
        )
    })

    it('keeps very long batch content constrained to the mobile card width', () => {
        const longName = 'OFFLINEJakartaBandungOktober2026DenganNamaBatchYangSangatPanjangTanpaSpasi'
        render(<BatchListClient data={{
            ...adminData,
            activeBatches: [{
                ...adminData.activeBatches[0],
                name: longName,
                notes: 'CatatanSangatPanjangTanpaSpasiYangTetapHarusMembungkusDiDalamKartuBatch',
            }],
            completedBatches: [],
        }} />)

        const card = screen.getByTestId('batch-card-batch-active')
        const title = screen.getByRole('heading', { name: longName })

        expect(card).toHaveClass('w-full', 'min-w-0', 'max-w-full')
        expect(title).toHaveClass('max-w-full', 'break-words', '[overflow-wrap:anywhere]')
        expect(screen.getByText(/CatatanSangatPanjang/)).toHaveClass('max-w-full', '[overflow-wrap:anywhere]')
    })

    it('shows edit and admin-only delete actions in the overflow menu', async () => {
        const user = userEvent.setup()
        render(<BatchListClient data={adminData} />)

        await user.click(screen.getByRole('button', { name: 'Opsi Batch September' }))
        const menu = screen.getByRole('menu')

        expect(within(menu).getByRole('menuitem', { name: 'Edit Batch' })).toHaveAttribute(
            'href',
            '/events/event-1/batches/batch-active/edit'
        )
        expect(within(menu).getByRole('menuitem', { name: 'Hapus Batch' })).toBeInTheDocument()
    })

    it('deletes a batch after confirmation and refreshes server data', async () => {
        const user = userEvent.setup()
        vi.mocked(deleteBatch).mockResolvedValueOnce({ success: true })
        render(<BatchListClient data={adminData} />)

        await user.click(screen.getByRole('button', { name: 'Opsi Batch September' }))
        await user.click(screen.getByRole('menuitem', { name: 'Hapus Batch' }))
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Ya, Hapus Batch' }))

        await waitFor(() => expect(deleteBatch).toHaveBeenCalledWith('batch-active'))
        await waitFor(() => expect(screen.queryByText('Batch September')).not.toBeInTheDocument())
        expect(refresh).toHaveBeenCalled()
    })

    it('does not expose deletion to a PIC', async () => {
        const user = userEvent.setup()
        render(<BatchListClient data={{
            ...adminData,
            userRole: 'user',
            userEventRole: 'pic',
            canDeleteBatch: false,
        }} />)

        await user.click(screen.getByRole('button', { name: 'Opsi Batch September' }))
        const menu = screen.getByRole('menu')
        expect(within(menu).getByRole('menuitem', { name: 'Edit Batch' })).toBeInTheDocument()
        expect(within(menu).queryByRole('menuitem', { name: 'Hapus Batch' })).not.toBeInTheDocument()
    })
})
