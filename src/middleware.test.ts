import { vi, describe, it, expect, beforeEach } from 'vitest';
import { middleware } from './middleware';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';

describe('middleware auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (url: string) => {
    return new NextRequest(new URL(url));
  };

  it('should redirect unauthenticated user from protected path (/dashboard) to /login', async () => {
    vi.mocked(auth as any).mockResolvedValueOnce(null);
    const req = createRequest('http://localhost:3000/dashboard');
    const res = await middleware(req);
    expect(res).toBeDefined();
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('should allow authenticated user to access protected path (/dashboard)', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'user' }
    } as any);
    const req = createRequest('http://localhost:3000/dashboard');
    const res = await middleware(req);
    expect(res?.headers.get('x-middleware-next')).toBe('1');
  });

  it('should redirect authenticated user from auth path (/login) to /dashboard', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'user' }
    } as any);
    const req = createRequest('http://localhost:3000/login');
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('should allow unauthenticated user to access auth path (/login)', async () => {
    vi.mocked(auth as any).mockResolvedValueOnce(null);
    const req = createRequest('http://localhost:3000/login');
    const res = await middleware(req);
    expect(res?.headers.get('x-middleware-next')).toBe('1');
  });

  it('should allow any user to access public non-auth paths (/about)', async () => {
    vi.mocked(auth as any).mockResolvedValueOnce(null);
    const req = createRequest('http://localhost:3000/about');
    const res = await middleware(req);
    expect(res?.headers.get('x-middleware-next')).toBe('1');
  });
});
