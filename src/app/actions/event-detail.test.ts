import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getEventDetail, getEventChartData } from './event-detail';
import { auth } from '@/auth';
import { mockSupabaseClient, MockQueryBuilder } from '@/tests/mocks/supabase';

// Mock next/cache
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
}));

describe('event-detail server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEventDetail', () => {
    it('should return null if user is not authenticated', async () => {
      vi.mocked(auth as any).mockResolvedValueOnce(null);

      const result = await getEventDetail('event-123');
      expect(result).toBeNull();
    });

    it('should return null if user profile is not found in database', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'user-without-profile', role: 'user' },
      } as any);

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') return new MockQueryBuilder(null);
        return new MockQueryBuilder(null);
      });

      const result = await getEventDetail('event-123');
      expect(result).toBeNull();
    });

    it('should return correct event details for administrator', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'admin-user', role: 'admin' },
      } as any);

      // Mock database queries
      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') {
          // Profile mock: is admin
          return new MockQueryBuilder({ id: 'admin-user', role: 'admin' });
        }
        if (table === 'events') {
          // Event mock
          return new MockQueryBuilder({
            id: 'event-123',
            name: 'Test Event',
            logo_url: 'http://logo.com',
            status: 'active',
          });
        }
        if (table === 'batches') {
          // Batches mock
          return new MockQueryBuilder([
            { id: 'batch-1', name: 'Batch 1', start_date: '2026-07-01', end_date: null, price: 100 },
          ]);
        }
        if (table === 'event_assignments') {
          return new MockQueryBuilder([
            {
              role: 'advertiser',
              user_id: 'adv-1',
              profiles: { id: 'adv-1', full_name: 'Advertiser 1', emoji: '🌟' },
            },
          ]);
        }
        if (table === 'reports') {
          return new MockQueryBuilder([
            {
              ads_spent: 100,
              tax_percentage: 10,
              leads_count: 5,
              closing_count: 2,
              id: 'report-1',
              report_date: '2026-07-14',
              notes: 'Good day',
              user_id: 'adv-1',
              profiles: { id: 'adv-1', full_name: 'Advertiser 1', emoji: '🌟' },
            },
          ]);
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventDetail('event-123', 'batch-1', 'all');
      expect(result).not.toBeNull();
      expect(result?.event.name).toBe('Test Event');
      expect(result?.batches).toHaveLength(1);
      expect(result?.batches[0].price).toBe(100);
      expect(result?.stats.totalSpend).toBe(110); // 100 * 1.10
      expect(result?.stats.totalLeads).toBe(5);
      expect(result?.stats.totalSales).toBe(2);
      expect(result?.stats.revenue).toBe(200); // 2 sales * 100 price
      expect(result?.stats.profitLoss).toBe(90); // 200 - 110
      expect(result?.stats.cpr).toBe(55); // 110 / 2
      expect(result?.stats.closingRate).toBe(40); // (2 / 5) * 100
      expect(result?.stats.roas).toBe(1.82); // 200 / 110
      expect(result?.userRole).toBe('admin');
      expect(result?.canManageEvent).toBe(true);
    });

    it('should return details for developer with range today', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'dev-user', role: 'developer' },
      } as any);

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') return new MockQueryBuilder({ id: 'dev-user', role: 'developer' });
        if (table === 'events') return new MockQueryBuilder({ id: 'event-123', name: 'Test Event' });
        if (table === 'batches') return new MockQueryBuilder([{ id: 'batch-1', name: 'Batch 1', price: 100 }]);
        return new MockQueryBuilder([]);
      });

      const result = await getEventDetail('event-123', 'batch-1', 'today');
      expect(result).not.toBeNull();
      expect(result?.userRole).toBe('developer');
    });

    it('should return details for advertiser with range yesterday', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'adv-user', role: 'user' },
      } as any);

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') return new MockQueryBuilder({ id: 'adv-user', role: 'user' });
        if (table === 'events') return new MockQueryBuilder({ id: 'event-123', name: 'Test Event' });
        if (table === 'event_assignments') {
          return new MockQueryBuilder([
            { role: 'advertiser', user_id: 'adv-user', profiles: { id: 'adv-user', full_name: 'Adv User', emoji: '😀' } }
          ]);
        }
        if (table === 'batches') return new MockQueryBuilder([{ id: 'batch-1', name: 'Batch 1', price: 100 }]);
        return new MockQueryBuilder([]);
      });

      const result = await getEventDetail('event-123', 'batch-1', 'yesterday');
      expect(result).not.toBeNull();
      expect(result?.userEventRole).toBe('advertiser');
    });

    it('should return details for PIC with range 7d', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'pic-user', role: 'user' },
      } as any);

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') return new MockQueryBuilder({ id: 'pic-user', role: 'user' });
        if (table === 'events') return new MockQueryBuilder({ id: 'event-123', name: 'Test Event' });
        if (table === 'event_assignments') {
          return new MockQueryBuilder([
            { role: 'pic', user_id: 'pic-user', profiles: { id: 'pic-user', full_name: 'Pic User', emoji: '😀' } }
          ]);
        }
        if (table === 'batches') return new MockQueryBuilder([{ id: 'batch-1', name: 'Batch 1', price: 100 }]);
        return new MockQueryBuilder([]);
      });

      const result = await getEventDetail('event-123', 'batch-1', '7d');
      expect(result).not.toBeNull();
      expect(result?.userEventRole).toBe('pic');
    });

    it('should return details with range 30d', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'pic-user', role: 'user' },
      } as any);

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') return new MockQueryBuilder({ id: 'pic-user', role: 'user' });
        if (table === 'events') return new MockQueryBuilder({ id: 'event-123', name: 'Test Event' });
        if (table === 'event_assignments') {
          return new MockQueryBuilder([
            { role: 'pic', user_id: 'pic-user', profiles: { id: 'pic-user', full_name: 'Pic User', emoji: '😀' } }
          ]);
        }
        if (table === 'batches') return new MockQueryBuilder([{ id: 'batch-1', name: 'Batch 1', price: 100 }]);
        return new MockQueryBuilder([]);
      });

      const result = await getEventDetail('event-123', 'batch-1', '30d');
      expect(result).not.toBeNull();
    });

    it('should return null if user is not assigned to event', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'regular-user', role: 'user' },
      } as any);

      // Mock database query returns null for event assignment
      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return new MockQueryBuilder({ id: 'regular-user', role: 'user' });
        }
        if (table === 'events') {
          return new MockQueryBuilder({ id: 'event-123', name: 'Test Event' });
        }
        if (table === 'event_assignments') {
          // single returns null meaning "no assignment"
          return new MockQueryBuilder(null);
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventDetail('event-123');
      expect(result).toBeNull();
    });

    it('should return null if event fetch fails or event is not found', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'admin-user', role: 'admin' },
      } as any);

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') return new MockQueryBuilder({ id: 'admin-user', role: 'admin' });
        if (table === 'events') {
          const builder = new MockQueryBuilder(null);
          builder.error = new Error('Database error');
          return builder;
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventDetail('event-123');
      expect(result).toBeNull();
    });
  });

  describe('getEventChartData', () => {
    const jakartaDate = () => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const shiftDate = (dateString: string, days: number) => {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().split('T')[0];
    };

    it('should return correct chart aggregations', async () => {
      vi.mocked(auth as any).mockResolvedValueOnce({
        user: { id: 'user-1' },
      } as any);

      const todayStr = jakartaDate();

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'reports') {
          return new MockQueryBuilder([
            { report_date: todayStr, leads_count: 10, closing_count: 2 },
          ]);
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventChartData('batch-1', 'today');
      expect(result).not.toBeNull();
      expect(result?.labels).toContain('HARI INI');
      expect(result?.leadsData).toEqual([10]);
      expect(result?.salesData).toEqual([2]);
    });

    it('should return yesterday chart data', async () => {
      vi.mocked(auth as any).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);

      const yesterdayStr = shiftDate(jakartaDate(), -1);

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'reports') {
          return new MockQueryBuilder([
            { report_date: yesterdayStr, leads_count: 5, closing_count: 1 },
          ]);
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventChartData('batch-1', 'yesterday');
      expect(result).not.toBeNull();
      expect(result?.labels).toContain('KEMARIN');
      expect(result?.leadsData).toEqual([5]);
      expect(result?.salesData).toEqual([1]);
    });

    it('should return 7d chart data', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);

      const date = new Date();
      date.setDate(date.getDate() - 4);
      const dateStr = date.toISOString().split('T')[0];

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'reports') {
          return new MockQueryBuilder([
            { report_date: dateStr, leads_count: 5, closing_count: 1 },
          ]);
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventChartData('batch-1', '7d');
      expect(result).not.toBeNull();
    });

    it('should return 30d chart data', async () => {
      vi.mocked(auth as any).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);

      const date = new Date();
      date.setDate(date.getDate() - 15);
      const dateStr = date.toISOString().split('T')[0];

      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'reports') {
          return new MockQueryBuilder([
            { report_date: dateStr, leads_count: 5, closing_count: 1 },
          ]);
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventChartData('batch-1', '30d');
      expect(result).not.toBeNull();
    });

    it('should return all chart data', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'reports') {
          return new MockQueryBuilder([
            { report_date: '2026-06-01', leads_count: 5, closing_count: 1 },
          ]);
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventChartData('batch-1', 'all');
      expect(result).not.toBeNull();
    });

    it('should return null if user is not authenticated', async () => {
      vi.mocked(auth as any).mockResolvedValueOnce(null);
      const result = await getEventChartData('batch-1', 'today');
      expect(result).toBeNull();
    });

    it('should handle empty reports for all range', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'reports') {
          return new MockQueryBuilder([]);
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventChartData('batch-1', 'all');
      expect(result).not.toBeNull();
    });

    it('should handle out of order reports for all range', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'reports') {
          return new MockQueryBuilder([
            { report_date: '2026-07-15', leads_count: 5, closing_count: 1 },
            { report_date: '2026-07-14', leads_count: 10, closing_count: 2 },
          ]);
        }
        return new MockQueryBuilder(null);
      });

      const result = await getEventChartData('batch-1', 'all');
      expect(result).not.toBeNull();
    });
  });
});
