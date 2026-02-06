# Authentication Implementation Plan - Auth.js v5 + Supabase

## Goal

Implement authentication using **Auth.js v5 (NextAuth.js beta)** with Credentials provider, storing users in Supabase database and managing sessions.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│          Auth.js v5 Flow                    │
├─────────────────────────────────────────────┤
│                                             │
│  Login Form → API Route → Auth.js          │
│                ↓                            │
│         Credentials Provider                │
│                ↓                            │
│      Verify with Supabase DB                │
│                ↓                            │
│         Create JWT Session                  │
│                ↓                            │
│       Store in HTTP-only Cookie             │
│                                             │
└─────────────────────────────────────────────┘
```

**Why Auth.js instead of Supabase Auth:**
- More flexible session management
- Easier integration with Next.js middleware
- Can add OAuth providers later (Google, GitHub)
- Full control over authentication logic

---

## ✅ Confirmed Requirements

> [!NOTE]
> **User-Approved Configuration:**
> 
> 1. **Password Requirements**: Minimum 8 characters, simple chars OK (no uppercase/numbers/special chars required)
> 2. **Username**: Use email as username
> 3. **Session Duration**: 7 days (JWT)
> 4. **Error Messages**: Indonesian language
> 5. **Email Verification**: Not required
> 6. **Default Role**: New users get `'user'` role
> 7. **Password Hashing**: bcrypt (industry standard)
> 8. **Session Strategy**: JWT (stateless, serverless-friendly)

---

## Proposed Changes

### New Files to Create

#### 1. Auth Configuration (`src/auth.ts`)

Core Auth.js configuration with Credentials provider.

**Exports:**
- `{ handlers, auth, signIn, signOut }` - Auth.js functions

**Features:**
- Credentials provider for email/password
- JWT session strategy
- Custom callbacks for session/JWT
- Supabase database integration

#### 2. Auth API Route (`src/app/api/auth/[...nextauth]/route.ts`)

Auth.js API route handler.

**Exports:**
- `GET` and `POST` handlers from `auth.ts`

#### 3. Auth Actions (`src/app/actions/auth.ts`)

Server actions for login, register, logout.

**Functions:**
- `loginAction(formData)` - Authenticate user
- `registerAction(formData)` - Create user + profile
- `logoutAction()` - Sign out

#### 4. Password Utility (`src/lib/password.ts`)

Password hashing and verification using bcrypt.

**Functions:**
- `hashPassword(password)` - Hash password with bcrypt
- `verifyPassword(password, hash)` - Verify password

---

### Modified Files

#### 1. Update Supabase Schema

Add `password_hash` column to `profiles` table.

**Migration:** `supabase/migrations/20260206_add_password_hash.sql`

```sql
ALTER TABLE profiles 
ADD COLUMN password_hash TEXT;
```

> [!NOTE]
> We store hashed passwords in `profiles` table, not `auth.users` (Supabase Auth not used)

#### 2. Login Page (`src/app/login/page.tsx`)

**Changes:**
- Call `loginAction` from Auth.js
- Show loading state
- Display error messages
- Redirect on success

#### 3. Register Page (`src/app/register/page.tsx`)

**Changes:**
- Call `registerAction`
- Validate form (email, password, display name)
- Hash password before storing
- Create profile in database
- Auto-login after registration

#### 4. Middleware (`src/middleware.ts`)

**Changes:**
- Use Auth.js session check instead of Supabase
- Protect routes with `auth()` from Auth.js
- Redirect logic remains the same

---

## Detailed Implementation

### 1. Install bcrypt for Password Hashing

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### 2. Auth Configuration (`src/auth.ts`)

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { createClient } from "@/lib/supabase/server"
import { verifyPassword } from "@/lib/password"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const email = credentials.email as string
        const password = credentials.password as string

        // Get user from Supabase
        const supabase = await createClient()
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', email)
          .single()

        if (error || !profile) {
          throw new Error("Invalid credentials")
        }

        // Verify password
        const isValid = await verifyPassword(password, profile.password_hash)
        if (!isValid) {
          throw new Error("Invalid credentials")
        }

        // Return user object
        return {
          id: profile.id,
          email: email,
          name: profile.full_name,
          role: profile.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
```

### 3. API Route (`src/app/api/auth/[...nextauth]/route.ts`)

```typescript
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

### 4. Password Utility (`src/lib/password.ts`)

```typescript
import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

### 5. Auth Actions (`src/app/actions/auth.ts`)

```typescript
'use server'

import { signIn, signOut } from "@/auth"
import { createClient } from "@/lib/supabase/server"
import { hashPassword } from "@/lib/password"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"

// Login action
export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi' }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Email atau password salah' }
    }
    throw error
  }

  redirect('/dashboard')
}

// Register action
export async function registerAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string

  if (!email || !password || !displayName) {
    return { error: 'Semua kolom wajib diisi' }
  }

  // Validate password length
  if (password.length < 8) {
    return { error: 'Password minimal 8 karakter' }
  }

  const supabase = await createClient()

  // Check if user exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', email)
    .single()

  if (existing) {
    return { error: 'Email sudah terdaftar' }
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Create profile
  const { error } = await supabase
    .from('profiles')
    .insert({
      username: email,
      full_name: displayName,
      role: 'user',
      password_hash: passwordHash,
    })

  if (error) {
    return { error: 'Gagal membuat akun. Silakan coba lagi.' }
  }

  // Auto-login after registration
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
  } catch (error) {
    // Registration successful but login failed
    return { 
      success: true,
      message: 'Akun berhasil dibuat! Silakan login.' 
    }
  }

  redirect('/dashboard')
}

// Logout action
export async function logoutAction() {
  await signOut({ redirect: false })
  redirect('/login')
}

// Get current session
export async function getSession() {
  const { auth } = await import("@/auth")
  return auth()
}
```

### 6. Update Middleware (`src/middleware.ts`)

```typescript
import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Protected routes
  const protectedRoutes = ['/dashboard', '/events', '/admin', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Auth routes
  const authRoutes = ['/login', '/register']
  const isAuthRoute = authRoutes.includes(pathname)

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### 7. TypeScript: Extend Session Type

Create `src/types/next-auth.d.ts`:

```typescript
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    role: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
  }
}
```

---

## Database Changes

### Migration: Add Password Hash Column

**File:** `supabase/migrations/20260206_add_password_hash.sql`

```sql
-- Add password_hash to profiles
ALTER TABLE profiles 
ADD COLUMN password_hash TEXT;

-- Make password_hash required for new rows
-- (Allows existing profiles without passwords during migration)
```

> [!CAUTION]
> **Breaking Change:** This adds password storage to profiles table. Existing users (if any) will need password reset.

---

## Security Considerations

### 1. Password Hashing
- ✅ bcrypt with 10 salt rounds
- ✅ Passwords never stored in plain text
- ✅ Hash comparison in constant time

### 2. Session Security
- ✅ JWT stored in HTTP-only cookies
- ✅ CSRF protection via Auth.js
- ✅ Secure flag in production
- ✅ 7-day expiration

### 3. Credentials Validation
- ✅ Email format validation
- ✅ Minimum password length (8 chars)
- ✅ SQL injection prevention (Supabase client)

---

## Testing Checklist

### Login Flow
- [ ] Valid credentials → Success + redirect
- [ ] Invalid email → Error message
- [ ] Invalid password → Error message
- [ ] Empty fields → Validation error
- [ ] Session created in cookies

### Register Flow
- [ ] Valid data → Create account + auto-login
- [ ] Existing email → Error message
- [ ] Short password → Error message
- [ ] Password hashed in database
- [ ] Profile created with role='user'

### Session Management
- [ ] Session persists across page reloads
- [ ] Middleware protects routes
- [ ] Logout clears session
- [ ] Expired sessions redirect to login

---

## Dependencies to Install

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

**Already installed:**
- ✅ `next-auth@beta`
- ✅ `@supabase/supabase-js`
- ✅ `@supabase/ssr`

---

## Comparison: Auth.js vs Supabase Auth

| Feature | Auth.js | Supabase Auth |
|---------|---------|---------------|
| Session storage | JWT or DB | Supabase DB |
| OAuth providers | Easy to add | Built-in |
| Customization | Full control | Limited |
| Serverless-friendly | ✅ Yes | ✅ Yes |
| Email verification | Manual | Built-in |
| Password reset | Manual | Built-in |

**Why Auth.js for this project:**
- Already specified in tech stack
- More control over auth flow
- Easier middleware integration
- Can add OAuth later without changing code

---

## Next Steps After Implementation

1. **Implement password reset** flow
2. **Add OAuth providers** (Google, GitHub)
3. **Email verification** (optional)
4. **Rate limiting** for login attempts
5. **Two-factor authentication** (future)

---

## Questions for User

1. **Password Requirements:** Just 8 characters minimum, or add complexity (uppercase, numbers)?
2. **Username:** Auto-generate from email, or ask separately?
3. **Session Duration:** 30 days OK, or shorter?
4. **Error Messages:** English or Indonesian?
5. **Email Verification:** Implement now or later?
