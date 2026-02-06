# Authentication Implementation - Ready for Review

## ✅ Confirmed Configuration

| Requirement | Value |
|-------------|-------|
| Password | Minimum 8 characters, simple (no complexity) |
| Username | Email (stored as username) |
| Session | 7 days (JWT) |
| Error Messages | Indonesian |
| Email Verification | Not required |
| Default Role | `'user'` |
| Auth Method | Auth.js v5 + bcrypt |

---

## 📁 Files to Create

### 1. `src/auth.ts`
Auth.js configuration with Credentials provider
- Verify credentials against Supabase DB
- Hash comparison with bcrypt
- JWT session (7 days)
- Custom callbacks for user data

### 2. `src/app/api/auth/[...nextauth]/route.ts`
Auth.js API route handler
- GET and POST endpoints
- Handles login/logout requests

### 3. `src/app/actions/auth.ts`
Server actions for forms
- `loginAction()` - Login with email/password
- `registerAction()` - Create account + auto-login
- `logoutAction()` - Clear session
- **Error messages in Indonesian**

### 4. `src/lib/password.ts`
Password utilities
- `hashPassword()` - bcrypt hash with 10 salt rounds
- `verifyPassword()` - Constant-time comparison

### 5. `src/types/next-auth.d.ts`
TypeScript type extensions
- Add `id` and `role` to session
- Type safety for Auth.js

### 6. `supabase/migrations/20260206_add_password_hash.sql`
Database migration
- Add `password_hash` column to `profiles` table

---

## 🔧 Files to Modify

### 1. `src/app/login/page.tsx`
- Connect to `loginAction`
- Show loading state
- Display Indonesian errors
- Redirect to `/dashboard` on success

### 2. `src/app/register/page.tsx`
- Connect to `registerAction` 
- Validate: email, password (8+ chars), display name
- Show Indonesian errors
- Auto-login after signup

### 3. `src/middleware.ts`
- Replace Supabase session check with Auth.js
- Use `auth()` from `@/auth`
- Same redirect logic (protected routes)

---

## 🇮🇩 Indonesian Error Messages

| Scenario | Error Message |
|----------|---------------|
| Empty fields | "Email dan password wajib diisi" / "Semua kolom wajib diisi" |
| Invalid credentials | "Email atau password salah" |
| Password too short | "Password minimal 8 karakter" |
| Email exists | "Email sudah terdaftar" |
| Account creation failed | "Gagal membuat akun. Silakan coba lagi." |
| Registration success | "Akun berhasil dibuat! Silakan login." |

---

## 📦 Dependencies to Install

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

Already installed: `next-auth@beta`, `@supabase/supabase-js`

---

## 🔐 Security Features

- ✅ bcrypt password hashing (10 salt rounds)
- ✅ JWT in HTTP-only cookies
- ✅ CSRF protection (Auth.js built-in)
- ✅ Secure flag in production
- ✅ 7-day session expiration
- ✅ Constant-time password comparison
- ✅ SQL injection prevention

---

## 🧪 What Will Be Tested

### Login
1. Valid email + password → Success + redirect to dashboard
2. Invalid credentials → Show "Email atau password salah"
3. Empty fields → Show "Email dan password wajib diisi"

### Register
1. Valid data → Create account + auto-login + redirect
2. Existing email → Show "Email sudah terdaftar"
3. Short password → Show "Password minimal 8 karakter"
4. Empty fields → Show "Semua kolom wajib diisi"

### Session
1. Protected routes blocked without login
2. Session persists for 7 days
3. Logout clears session + redirects to login

---

## ⚠️ Important Notes

1. **Database Migration Required**
   - Must run `20260206_add_password_hash.sql` before testing
   - Adds `password_hash` column to `profiles` table

2. **No Supabase Auth**
   - Not using Supabase's built-in auth system
   - Using Auth.js with Supabase as database only

3. **Auto-Login After Registration**
   - Users don't need to login twice
   - Seamless onboarding experience

4. **Username = Email**
   - Email stored in `username` field
   - Users can change username in settings later

---

## 🚀 Execution Steps

When you approve, I will:

1. Install bcrypt packages
2. Create Auth.js configuration (`src/auth.ts`)
3. Create API route (`src/app/api/auth/[...nextauth]/route.ts`)
4. Create auth actions (`src/app/actions/auth.ts`)
5. Create password utils (`src/lib/password.ts`)
6. Create type definitions (`src/types/next-auth.d.ts`)
7. Create database migration (`supabase/migrations/20260206_add_password_hash.sql`)
8. Update login page (`src/app/login/page.tsx`)
9. Update register page (`src/app/register/page.tsx`)
10. Update middleware (`src/middleware.ts`)

---

## ✋ Review Checklist

Please confirm:

- [ ] Password: 8 chars minimum, simple (no complexity) ✅
- [ ] Username: Email as username ✅
- [ ] Session: 7 days ✅
- [ ] Errors: Indonesian language ✅
- [ ] Email verification: Not needed ✅
- [ ] Default role: 'user' ✅
- [ ] All files to create/modify look correct

**Ready to proceed?** Reply with "yes" to start implementation, or let me know if anything needs changes.
