import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventDetailClient } from './event-detail-client';
import { getEventChartData } from '@/app/actions/event-detail';
import { deleteBatch } from '@/app/actions/batches';

// Mock Router and SearchParams
const mockPush = vi.fn();
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams('?batch=batch-1&range=today'),
    usePathname: () => '/events/event-123',
  };
});

// Mock Actions
vi.mock('@/app/actions/event-detail', () => ({
  getEventDetail: vi.fn(),
  getEventChartData: vi.fn().mockResolvedValue({
    labels: ['MON', 'TUE'],
    leadsData: [5, 10],
    salesData: [1, 2],
    todayLeads: 10,
  }),
}));

vi.mock('@/app/actions/batches', () => ({
  deleteBatch: vi.fn(),
}));

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn((key, fetcher, options) => ({
    data: options?.fallbackData,
    error: null,
    mutate: vi.fn(),
  })),
}));

// Mock dynamic component line-chart
vi.mock('./line-chart', () => ({
  default: () => <div data-testid="line-chart">Mock Chart</div>,
}));

// Mock UI Layout components to simplify rendering
vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

const mockEventDetailData: any = {
  event: {
    id: 'event-123',
    name: 'Marketing Event',
    logo_url: null,
    status: 'active',
  },
  batches: [
    { id: 'batch-1', name: 'Batch Jan 2026', startDate: '2026-01-01', endDate: null, price: 150000 },
    { id: 'batch-2', name: 'Batch Feb 2026', startDate: '2026-02-01', endDate: null, price: 200000 },
  ],
  currentBatchId: 'batch-1',
  range: 'today',
  stats: {
    totalSpend: 500000,
    totalLeads: 50,
    totalSales: 10,
    cpr: 50000,
    closingRate: 20,
    revenue: 1500000,
    profitLoss: 1000000,
    roas: 3,
  },
  advertisers: [],
  pics: [],
  reports: [],
  userRole: 'admin',
  userEventRole: 'pic',
  currentUserId: 'user-admin',
  canManageEvent: true,
  canAddReport: true,
  canDeleteBatch: true,
};

describe('EventDetailClient integration test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders event layout and header correctly', async () => {
    render(<EventDetailClient data={mockEventDetailData} />);

    expect(screen.getByText('Marketing Event')).toBeInTheDocument();
    expect(screen.getAllByText('Batch Jan 2026')[0]).toBeInTheDocument();
    expect(screen.getByText(/Harga Tiket:/i)).toBeInTheDocument();
    expect(screen.getByText('Rp 150.000')).toBeInTheDocument();
  });

  it('allows switching between tabs', async () => {
    render(<EventDetailClient data={mockEventDetailData} />);

    // Default tab is Overview
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveClass('text-primary');

    // Click Reports tab
    const reportsTabButton = screen.getByRole('button', { name: 'Reports' });
    await userEvent.click(reportsTabButton);

    expect(reportsTabButton).toHaveClass('text-primary');
  });

  it('allows range selection changes', async () => {
    render(<EventDetailClient data={mockEventDetailData} />);

    const range7dButton = screen.getByRole('button', { name: '7 Hari' });
    await userEvent.click(range7dButton);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('range=7d'));
  });

  it('allows batch selection changes', async () => {
    render(<EventDetailClient data={mockEventDetailData} />);

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'batch-2');

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('batch=batch-2'));
  });

  it('shows delete batch modal and calls delete action on confirm', async () => {
    vi.mocked(deleteBatch).mockResolvedValueOnce({ success: true } as any);
    render(<EventDetailClient data={mockEventDetailData} />);

    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: /More options/i });
    await userEvent.click(menuButton);

    // Click Delete Batch item
    const deleteMenuItem = screen.getByRole('button', { name: /Hapus Batch/i });
    await userEvent.click(deleteMenuItem);

    // Verify modal is open
    expect(screen.getByText('Hapus Batch?')).toBeInTheDocument();

    // Click Confirm button
    const confirmButton = screen.getByRole('button', { name: 'Ya, Hapus' });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteBatch).toHaveBeenCalledWith('batch-1');
    });
  });
});
