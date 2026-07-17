import { vi } from 'vitest';
import '@testing-library/jest-dom';
import './mocks/supabase';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn((url) => {
    // Standard mock redirect that Next.js throws
    const error = new Error(`NEXT_REDIRECT: ${url}`);
    (error as any).digest = `NEXT_REDIRECT;307;${url};default;`;
    throw error;
  }),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock Next Auth (@/auth)
vi.mock('@/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  auth: vi.fn().mockResolvedValue({
    user: {
      id: 'mock-user-id',
      email: 'mock-user@example.com',
      name: 'Mock User',
      role: 'user',
    },
  }),
}));

vi.mock('next-auth', () => {
  class AuthError extends Error {
    type = 'AuthError';
    constructor(message?: string) {
      super(message);
      this.name = 'AuthError';
    }
  }
  return {
    default: vi.fn(),
    AuthError,
  };
});

// Mock process.env credentials
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'mock-publishable-key';
process.env.SUPABASE_SECRET_KEY = 'mock-secret-key';

// Mock window globals that JSDOM doesn't implement by default
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: MockResizeObserver,
  });
}
