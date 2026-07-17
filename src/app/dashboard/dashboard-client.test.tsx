import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardClient } from './dashboard-client';
import { toggleEventStatus } from '@/app/actions/dashboard';

// Mock dashboard actions
vi.mock('@/app/actions/dashboard', () => ({
  toggleEventStatus: vi.fn(),
  getDashboardData: vi.fn(),
}));

// Mock SWR to just return whatever is passed as fallback
vi.mock('swr', () => ({
  default: vi.fn((key, fetcher, options) => ({
    data: options?.fallbackData,
    error: null,
    mutate: vi.fn(),
  })),
}));

// Mock next/image to render a normal img tag
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

const mockAdminData = {
  user: {
    id: 'user-admin',
    displayName: 'Admin User',
    email: 'admin@example.com',
    emoji: '👑',
    role: 'admin' as const,
  },
  activeEvents: [
    { id: 'event-1', name: 'Active Event A', status: 'active' as const, logo_url: null, batchCount: 2 },
  ],
  inactiveEvents: [
    { id: 'event-2', name: 'Inactive Event B', status: 'completed' as const, logo_url: null, batchCount: 1 },
  ],
};

const mockUserData = {
  user: {
    id: 'user-regular',
    displayName: 'Regular User',
    email: 'user@example.com',
    emoji: '😀',
    role: 'user' as const,
  },
  activeEvents: [],
  inactiveEvents: [],
};

describe('DashboardClient integration test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard layout and active/inactive events for admin', () => {
    render(<DashboardClient data={mockAdminData} />);

    expect(screen.getByText(/Selamat datang,/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin User/i)).toBeInTheDocument();

    // Verify events list
    expect(screen.getByText('Active Event A')).toBeInTheDocument();
    expect(screen.getByText('Inactive Event B')).toBeInTheDocument();

    // Verify event batch counts
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 Batches
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 Batch
  });

  it('shows empty state warning for regular user with no assigned events', () => {
    render(<DashboardClient data={mockUserData} />);

    expect(screen.getByText(/Selamat datang,/i)).toBeInTheDocument();
    expect(screen.getByText(/Regular User/i)).toBeInTheDocument();

    expect(screen.getByText('Belum Ada Event')).toBeInTheDocument();
    expect(screen.getByText(/Anda belum memiliki akses ke event apapun/i)).toBeInTheDocument();
  });

  it('opens confirmation modal and toggles event status for admin user', async () => {
    vi.mocked(toggleEventStatus).mockResolvedValueOnce({ success: true });
    render(<DashboardClient data={mockAdminData} />);

    // Click toggle button for "Active Event A"
    const toggleButton = screen.getByRole('button', { name: /Deactivate event/i });
    await userEvent.click(toggleButton);

    // Verify modal elements are displayed
    expect(screen.getByText('Konfirmasi Perubahan')).toBeInTheDocument();
    expect(screen.getByText(/Apakah anda yakin ingin mengubah status event/i)).toBeInTheDocument();

    // Confirm the action
    const confirmButton = screen.getByRole('button', { name: 'Ya, Ubah' });
    await userEvent.click(confirmButton);

    // Verify event toggle endpoint was called
    await waitFor(() => {
      expect(toggleEventStatus).toHaveBeenCalledWith('event-1', 'completed');
    });
  });
});
