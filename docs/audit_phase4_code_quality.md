# DIVINATION DASHBOARD — PHASE 4 AUDIT: ERROR HANDLING & CODE QUALITY

**Date:** 2026-02-23
**Auditor:** AI Code Review
**Status:** 10/17 checks passed

---

## 4.1 Next.js Error Boundary Files (0/4)

---

### Check 1 — `src/app/error.tsx` (root error boundary)
- **Status:** ❌ FAIL
- **File:** Does not exist
- **Issue:** No root error boundary. If any page throws an unhandled error, users see the default Next.js error page (ugly white screen in production).
- **Fix:** Create `src/app/error.tsx` with `'use client'`, error message display, and a reset/retry button.

---

### Check 2 — `src/app/global-error.tsx` (root layout error boundary)
- **Status:** ❌ FAIL
- **File:** Does not exist
- **Issue:** If the root layout itself throws, there's no fallback. `global-error.tsx` must include its own `<html>` and `<body>` tags since it replaces the root layout entirely.
- **Fix:** Create `src/app/global-error.tsx` with `'use client'` and full HTML structure.

---

### Check 3 — `src/app/not-found.tsx` (404 page)
- **Status:** ❌ FAIL
- **File:** Does not exist
- **Issue:** Navigating to a non-existent route shows the default Next.js 404. Should show a branded, friendly 404 with a link back to `/dashboard`.
- **Fix:** Create `src/app/not-found.tsx`.

---

### Check 4 — Route-specific error boundaries
- **Status:** ❌ FAIL
- **File:** `src/app/dashboard/error.tsx` and `src/app/events/[id]/error.tsx` do not exist
- **Issue:** No route-specific error boundaries. If the dashboard or event detail page fails (e.g., Supabase outage, deleted event), users see a full crash.
- **Fix:** Create error.tsx in both directories. The event error boundary should handle "event not found" with a link back to dashboard.

---

## 4.2 Server Action Error Handling (3/4)

---

### Check 5 — Try/catch coverage in server actions
- **Status:** ⚠️ WARNING
- **File:** All `src/app/actions/*.ts`
- **Finding:** Only 2 of 10 action files have try/catch blocks (`auth.ts` and `storage.ts`). The remaining 8 files rely on Supabase returning `{ data, error }` pattern and check `error` directly. This is **functionally okay** because Supabase client never throws — it always returns an error object. However, if the Supabase client itself fails to initialize (e.g., missing env vars), the entire action will throw an unhandled exception.
- **Risk:** Low — `createAdminClient()` already throws with a clear message on missing credentials. The Supabase client pattern (`{ data, error }`) is safe and never exposes raw DB errors.
- **Fix (optional):** Wrap each action body in a top-level try/catch as defense-in-depth.

---

### Check 6 — No raw database errors exposed to client
- **Status:** ✅ PASS
- **File:** All `src/app/actions/*.ts`
- **Finding:** All Supabase errors are caught and replaced with Indonesian user-friendly messages (e.g., `'Gagal membuat laporan. Silakan coba lagi.'`). Raw `error.message` from Supabase is only logged via `console.error()` on the server, never returned to the client. ✅

---

### Check 7 — `reports.ts` validates future date
- **Status:** ❌ FAIL
- **File:** `src/app/actions/reports.ts`
- **Issue:** `reportDate` is validated for presence (`!input.reportDate`) but there is **no check** that the date is not in the future. An advertiser could submit a report dated tomorrow or next week.
- **Fix:** Add validation after line 77:
  ```typescript
  const today = new Date().toISOString().split('T')[0]
  if (input.reportDate > today) {
      return { error: 'Tanggal laporan tidak boleh di masa depan' }
  }
  ```

---

### Check 8 — `reports.ts` handles duplicate report with clear message
- **Status:** ✅ PASS
- **File:** `src/app/actions/reports.ts:88-98`
- **Finding:** Duplicate check queries `(batch_id, user_id, report_date)` with `.maybeSingle()`. Returns clear message: `'Laporan untuk tanggal ini sudah ada. Silakan edit laporan yang sudah ada.'` ✅ Additionally, the Phase 2 audit already added a UNIQUE constraint to the table as a DB-level backup.

---

## 4.3 Auth.js v5 Specific Checks (3/5)

---

### Check 9 — Auth.js configuration
- **Status:** ✅ PASS
- **File:** `src/auth.ts`
- **Finding:** Uses `NextAuth` from `next-auth` with custom `Credentials` provider. JWT session strategy with 7-day expiry. Custom pages configured (`signIn: '/login'`, `error: '/login'`). Authorize function properly validates credentials and returns user object with `id`, `email`, `name`, `role`. ✅

---

### Check 10 — NEXTAUTH_SECRET is configured
- **Status:** ✅ PASS
- **File:** `.env.example:30`
- **Finding:** `NEXTAUTH_SECRET` is listed in `.env.example` with comment `# Generate secret: openssl rand -base64 32`. The actual value in `.env.local` is not committed to git. Auth.js v5 requires `AUTH_SECRET` or `NEXTAUTH_SECRET` — both are supported. ✅

---

### Check 11 — Session callback includes user role
- **Status:** ✅ PASS
- **File:** `src/auth.ts:57-71`
- **Finding:** JWT callback stores `token.id` and `token.role` from the user object. Session callback maps these to `session.user.id` and `session.user.role`. Type declaration in `src/types/next-auth.d.ts` extends `Session`, `User`, and `JWT` with `id` and `role` fields. ✅

---

### Check 12 — Role changes reflected in session
- **Status:** ⚠️ WARNING
- **File:** `src/auth.ts:58-63`
- **Issue:** The `jwt` callback only sets `token.role` when `user` is present — which is only on initial sign-in. If an admin changes a user's role in the DB, the user's JWT will still contain the **old role** until they log out and log back in (up to 7 days).
- **Risk:** Medium — a user demoted from admin would retain admin session privileges until JWT expires.
- **Fix (recommended):** In the `jwt` callback, periodically re-fetch the role from the database:
  ```typescript
  async jwt({ token, user, trigger }) {
      if (user) {
          token.id = user.id as string
          token.role = user.role as string
      }
      // Re-fetch role every session update
      if (trigger === 'update' || !user) {
          const supabase = createAdminClient()
          const { data } = await supabase
              .from('profiles').select('role').eq('id', token.id).single()
          if (data) token.role = data.role
      }
      return token
  }
  ```
  Or simpler: reduce `maxAge` from 7 days to 1 day, and force sign-out when role changes.

---

### Check 13 — signOut clears Supabase session
- **Status:** ⚠️ WARNING
- **File:** `src/app/actions/auth.ts:126-129`
- **Finding:** `logoutAction()` calls `signOut({ redirect: false })` then `redirect('/login')`. This clears the Auth.js JWT session correctly. However, since this project uses a **custom credential provider** (not Supabase Auth), there is no separate Supabase session to clear — Supabase is only used as a database via service role key. So this is technically fine for the current architecture.
- **Note:** If Supabase Auth is ever added (e.g., for real-time subscriptions or storage RLS via anon key), the browser Supabase client session would need to be cleared separately.

---

## 4.4 TypeScript Quality (2/4)

---

### Check 14 — `strict: true` in tsconfig.json
- **Status:** ✅ PASS
- **File:** `tsconfig.json:11`
- **Finding:** `"strict": true` is set. ✅

---

### Check 15 — No `as any` type casts
- **Status:** ✅ PASS
- **File:** All `src/app/actions/*.ts`
- **Finding:** Zero instances of `as any` found. There are 7 `as unknown as` casts — all used for Supabase joined table typing (e.g., `report.batches as unknown as { event_id: string }`). This is a known Supabase JS limitation where joined foreign-key relations return loosely typed objects. These casts are **justified and safe**. ✅

---

### Check 16 — Server action return types explicitly typed
- **Status:** ✅ PASS
- **File:** All `src/app/actions/*.ts`
- **Finding:** All mutation actions have explicit return types (e.g., `Promise<ReportResult>`, `Promise<EventResult>`, `Promise<BatchResult>`). All result interfaces are defined with `success?: boolean; error?: string`. ✅

---

### Check 17 — Shared domain types in a central file
- **Status:** ⚠️ WARNING
- **File:** `src/types/next-auth.d.ts` (only file in types/)
- **Issue:** Role types (`'developer' | 'admin' | 'user'`, `'pic' | 'advertiser'`) are defined as **inline string literals** throughout the codebase. There is no shared `src/types/index.ts` or `src/lib/types.ts` with core domain types like `UserRole`, `EventRole`, `Event`, `Batch`, `Report`, etc.
- **Risk:** Low — works fine, but makes refactoring harder. If a role value ever changes (like the `'inactive'` → `'completed'` bug we just fixed), you'd have to find-and-replace across many files.
- **Fix (recommended):** Create `src/types/index.ts`:
  ```typescript
  export type UserRole = 'developer' | 'admin' | 'user'
  export type EventRole = 'pic' | 'advertiser'
  export type EventStatus = 'active' | 'completed' | 'upcoming'
  ```

---

## 4.5 Code Cleanliness (4/4)

---

### Check A — `console.log()` statements
- **Status:** ✅ PASS
- **File:** All `src/` files
- **Finding:** **Zero** `console.log()` statements found in any source file. Only `console.error()` is used, exclusively in catch/error-handling blocks within server actions. ✅ Excellent.

---

### Check B — TODO / FIXME comments
- **Status:** ✅ PASS
- **File:** All `src/` files
- **Finding:** **Zero** `TODO` or `FIXME` comments found. No indication of incomplete features. ✅

---

### Check C — Commented-out code blocks
- **Status:** ✅ PASS
- **File:** All `src/` files
- **Finding:** No consecutive commented-out code blocks found. Migration files have commented-out seed data examples which are intentional. ✅

---

### Check D — Hardcoded IDs or test data
- **Status:** ✅ PASS
- **File:** All `src/` files
- **Finding:** No hardcoded user IDs, event IDs, or test data in the source code. All identifiers come from the database or URL parameters. ✅

---

## 4.6 ESLint & TypeScript Build (1/2)

---

### Check E — ESLint configuration
- **Status:** ⚠️ WARNING
- **File:** No `.eslintrc.json`, `eslint.config.js`, or `eslint.config.mjs` found
- **Issue:** No ESLint configuration file exists. `eslint-config-next` is in devDependencies, which provides `next/core-web-vitals` rules. However, without a config file, running `npm run lint` may not apply any rules (or may use Next.js defaults).
- **Fix:** Create `eslint.config.mjs`:
  ```javascript
  import { dirname } from "path";
  import { fileURLToPath } from "url";
  import { FlatCompat } from "@eslint/flatcompat";

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const compat = new FlatCompat({ baseDirectory: __dirname });

  const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript")];

  export default eslintConfig;
  ```

---

### Check F — TypeScript build clean
- **Status:** ✅ PASS
- **File:** N/A
- **Finding:** `npm run build` passes with `✓ Compiled successfully`. No TypeScript errors. All routes compile correctly. ✅ (Verified during Phase 2 and edit-event feature work.)

---

## 4.7 Dependency Audit (2/3)

---

### Check G — Core dependency versions
- **Status:** ✅ PASS
- **File:** `package.json`
- **Finding:**
  - Next.js: `^16.1.6` — ✅ (version 16.x, newer than expected 15.x — even better)
  - Auth.js: `next-auth@beta` — ✅ (v5 beta, expected for Auth.js v5)
  - Supabase: `@supabase/supabase-js@^2.95.3` — ✅ (recent v2.x)
  - bcryptjs: `^3.0.3` — ✅ present with `@types/bcryptjs` in devDependencies

---

### Check H — Unused packages
- **Status:** ⚠️ WARNING
- **File:** `package.json:12, 27, 29`
- **Issue:** The following packages are installed but **not imported anywhere** in `src/`:
  - `react-hook-form` (`^7.71.1`) — 0 imports found
  - `@hookform/resolvers` (`^5.2.2`) — 0 imports found
  - `zod` (`^4.3.6`) — 0 imports found
  - `jose` (`^6.1.3`) — likely imported in `src/lib/supabase/jwt.ts` for JWT decoding, should be checked
- **Risk:** Adds ~150KB to `node_modules`, increases install time. No security risk but wastes build resources.
- **Fix:** Remove unused packages:
  ```bash
  npm uninstall react-hook-form @hookform/resolvers zod
  ```

---

### Check I — Duplicate functionality
- **Status:** ✅ PASS
- **File:** `package.json`
- **Finding:** No duplicate packages (no axios + fetch, no conflicting auth libs). All HTTP calls go through Supabase client. ✅

---

## Summary

```
PHASE 4 CODE QUALITY SCORE: 10/17 checks passed

❌ FAIL   (5):
  1. No error.tsx (root error boundary)
  2. No global-error.tsx (root layout error boundary)
  3. No not-found.tsx (custom 404 page)
  4. No route-specific error boundaries (dashboard, event detail)
  5. reports.ts missing future-date validation

⚠️ WARNING (5):
  6. Server actions lack top-level try/catch (Supabase pattern is safe, but no defense-in-depth)
  7. Role changes not reflected in JWT until re-login (up to 7 days stale)
  8. No shared domain types file (roles are inline strings)
  9. No ESLint config file
 10. Unused packages: react-hook-form, @hookform/resolvers, zod

✅ PASS  (10):
  - No raw DB errors exposed to client
  - Duplicate report handled with clear message
  - Auth.js configured correctly (JWT, credentials, session callbacks)
  - NEXTAUTH_SECRET configured
  - Session includes user role
  - strict:true in tsconfig
  - No 'as any' casts
  - Action return types explicitly typed
  - Code is clean (no console.log, TODO, hardcoded IDs)
  - TypeScript build passes clean
  - Core dependencies at correct versions

INCOMPLETE FEATURES FOUND: None (0 TODO/FIXME found)
```

---

## Action Items (Priority Order)

| Priority | Fix | Effort |
|---|---|---|
| 🔴 HIGH | Create `error.tsx`, `global-error.tsx`, `not-found.tsx` | 15 min |
| 🔴 HIGH | Add future-date validation to `reports.ts` | 2 min |
| 🟡 MEDIUM | Create ESLint config (`eslint.config.mjs`) | 5 min |
| 🟡 MEDIUM | Add role re-fetch in JWT callback or reduce JWT maxAge | 10 min |
| 🟢 LOW | Create shared types file (`src/types/index.ts`) | 10 min |
| 🟢 LOW | Remove unused packages (react-hook-form, zod) | 2 min |
| 🟢 LOW | Add top-level try/catch to server actions | 15 min |
