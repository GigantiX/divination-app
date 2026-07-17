import { vi, describe, it, expect, beforeEach } from 'vitest';
import { loginAction, registerAction, logoutAction } from './auth';
import { signIn, signOut } from '@/auth';
import { mockSupabaseClient, MockQueryBuilder } from '@/tests/mocks/supabase';
import { AuthError } from 'next-auth';

vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/emojis', () => ({
  getRandomEmoji: vi.fn().mockReturnValue('😀'),
}));

function createFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  return formData;
}

describe('auth server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginAction', () => {
    it('should return error if email or password is missing', async () => {
      const formData = createFormData({ email: 'test@example.com' });
      const result = await loginAction(formData);
      expect(result).toEqual({ error: 'Email dan password wajib diisi' });
      expect(signIn).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard on successful credentials sign-in', async () => {
      const formData = createFormData({ email: 'test@example.com', password: 'password123' });
      vi.mocked(signIn).mockResolvedValue(undefined as any);

      await expect(loginAction(formData)).rejects.toThrow('NEXT_REDIRECT: /dashboard');
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      });
    });

    it('should return custom error on CredentialsSignin failure', async () => {
      const formData = createFormData({ email: 'test@example.com', password: 'wrongpassword' });
      const authError = new AuthError('Auth error');
      authError.type = 'CredentialsSignin';
      vi.mocked(signIn).mockRejectedValue(authError);

      const result = await loginAction(formData);
      expect(result).toEqual({ error: 'Email atau password salah' });
    });
  });

  describe('registerAction', () => {
    it('should return error if fields are missing', async () => {
      const res = await registerAction(createFormData({ email: 'test@example.com' }));
      expect(res).toEqual({ error: 'Semua kolom wajib diisi' });
    });

    it('should return error if email format is invalid', async () => {
      const res = await registerAction(createFormData({ email: 'bad-email', password: 'password123', displayName: 'User' }));
      expect(res).toEqual({ error: 'Format email tidak valid' });
    });

    it('should return error if password is less than 8 characters', async () => {
      const res = await registerAction(createFormData({ email: 'test@example.com', password: 'short', displayName: 'User' }));
      expect(res).toEqual({ error: 'Password minimal 8 karakter' });
    });

    it('should return error if display name is less than 2 characters', async () => {
      const res = await registerAction(createFormData({ email: 'test@example.com', password: 'password123', displayName: 'A' }));
      expect(res).toEqual({ error: 'Nama minimal 2 karakter' });
    });

    it('should return error if email already exists', async () => {
      const formData = createFormData({
        email: 'exists@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      // Mock database checking: user exists
      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return new MockQueryBuilder({ id: 'existing-id' });
        }
        return new MockQueryBuilder(null);
      });

      const result = await registerAction(formData);
      expect(result).toEqual({ error: 'Email sudah terdaftar' });
    });

    it('should insert new profile and auto-login user', async () => {
      const formData = createFormData({
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      });

      // Mock database checking: user doesn't exist
      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') {
          // returns null for .single() to mock "no existing user"
          return new MockQueryBuilder(null);
        }
        return new MockQueryBuilder(null);
      });

      // Mock auto-login behavior (signIn throws NEXT_REDIRECT which is caught or handled)
      vi.mocked(signIn).mockImplementation(async () => {
        const error = new Error('NEXT_REDIRECT: /dashboard');
        (error as any).digest = 'NEXT_REDIRECT;307;/dashboard;default;';
        throw error;
      });

      await expect(registerAction(formData)).rejects.toThrow('NEXT_REDIRECT: /dashboard');
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'new@example.com',
        password: 'password123',
        redirectTo: '/dashboard',
      });
    });

    it('should return error if database insert fails', async () => {
      const formData = createFormData({
        email: 'fail@example.com',
        password: 'password123',
        displayName: 'Fail User',
      });

      // Mock checking: user doesn't exist
      vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
        if (table === 'profiles') {
          const qb = new MockQueryBuilder(null);
          // Set error on insert
          qb.insert = vi.fn().mockImplementation(() => new MockQueryBuilder(null, new Error('Database insert failed')));
          return qb;
        }
        return new MockQueryBuilder(null);
      });

      const result = await registerAction(formData);
      expect(result).toEqual({ error: 'Gagal membuat akun. Silakan coba lagi.' });
    });
  });

  describe('logoutAction', () => {
    it('should sign out and redirect to login', async () => {
      await expect(logoutAction()).rejects.toThrow('NEXT_REDIRECT: /login');
      expect(signOut).toHaveBeenCalledWith({ redirect: false });
    });
  });
});
