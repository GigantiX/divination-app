import { vi } from 'vitest';

export class MockQueryBuilder {
  data: any = null;
  error: any = null;

  constructor(data: any = null, error: any = null) {
    this.data = data;
    this.error = error;
  }

  select = vi.fn().mockReturnThis();
  insert = vi.fn().mockReturnThis();
  update = vi.fn().mockReturnThis();
  delete = vi.fn().mockReturnThis();
  eq = vi.fn().mockReturnThis();
  gte = vi.fn().mockReturnThis();
  lte = vi.fn().mockReturnThis();
  order = vi.fn().mockReturnThis();
  limit = vi.fn().mockReturnThis();
  range = vi.fn().mockReturnThis();

  single = vi.fn().mockImplementation(async () => {
    const singleData = Array.isArray(this.data) ? this.data[0] : this.data;
    return { data: singleData || null, error: this.error };
  });

  maybeSingle = vi.fn().mockImplementation(async () => {
    const singleData = Array.isArray(this.data) ? this.data[0] : this.data;
    return { data: singleData || null, error: this.error };
  });

  then(onfulfilled: any) {
    return Promise.resolve({ data: this.data, error: this.error }).then(onfulfilled);
  }
}

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  from: vi.fn().mockImplementation(() => new MockQueryBuilder([])),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock-url.com/file' } })),
    })),
  },
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseClient),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient),
}));
