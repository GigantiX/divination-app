import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password utility', () => {
  it('should hash a password successfully', async () => {
    const plainPassword = 'my-secure-password';
    const hash = await hashPassword(plainPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plainPassword);
    // Bcrypt hashes typically start with $2a$ or $2b$
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  it('should verify correct password successfully', async () => {
    const plainPassword = 'super-secret-password';
    const hash = await hashPassword(plainPassword);

    const isMatch = await verifyPassword(plainPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const plainPassword = 'correct-password';
    const wrongPassword = 'wrong-password';
    const hash = await hashPassword(plainPassword);

    const isMatch = await verifyPassword(wrongPassword, hash);
    expect(isMatch).toBe(false);
  });
});
