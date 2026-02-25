# DIVINATION DASHBOARD — PHASE 5 AUDIT: DEPLOYMENT & FINAL READINESS

**Date:** 2026-02-25
**Auditor:** AI Code Review
**Status:** 9/14 checks passed

---

## 5.1 next.config.ts Production Settings (1/2)

---

### Check 1 — Supabase image hostname configured
- **Status:** ✅ PASS
- **File:** `next.config.ts:3-16`
- **Finding:** `images.remotePatterns` dynamically extracts the Supabase hostname from `NEXT_PUBLIC_SUPABASE_URL` and allows `/storage/v1/object/public/**`. This is correct and flexible — works across different Supabase projects. `compress` is not disabled (default `true`). `reactStrictMode` is default (not explicitly set to `false`). ✅

---

### Check 2 — Security headers configured
- **Status:** ❌ FAIL
- **File:** `next.config.ts`
- **Issue:** No `headers()` async function configured. Missing security headers:
  - `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
  - `X-Content-Type-Options: nosniff` — prevents MIME sniffing
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=()`
- **Risk:** The app could be embedded in an iframe on a malicious site (clickjacking attack). Headers are a simple defense layer.
- **Fix:** Add to `next.config.ts`:
  ```typescript
  const nextConfig: NextConfig = {
      images: { /* existing */ },
      async headers() {
          return [
              {
                  source: '/(.*)',
                  headers: [
                      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                      { key: 'X-Content-Type-Options', value: 'nosniff' },
                      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                      { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
                  ],
              },
          ]
      },
  }
  ```

---

## 5.2 Environment Variables Completeness (1/2)

---

### Check 3 — All env vars used in code are documented in .env.example
- **Status:** ⚠️ WARNING
- **File:** `.env.example`
- **Finding:** Environment variables cross-reference:

| Variable | Used in code? | In .env.example? | Status |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | ✅ Yes | ✅ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | ✅ Yes | ✅ |
| `SUPABASE_SECRET_KEY` | ✅ Yes | ✅ Yes | ✅ |
| `NEXTAUTH_SECRET` | ✅ Auth.js auto-reads | ✅ Yes | ✅ |
| `NEXTAUTH_URL` | ✅ Auth.js auto-reads | ✅ Yes | ✅ |
| `DATABASE_URL` | ❌ Not used | ✅ Listed | ⚠️ Dead |
| `DIRECT_URL` | ❌ Not used | ✅ Listed | ⚠️ Dead |
| `NEXT_PUBLIC_APP_URL` | ❌ Not used | ✅ Listed | ⚠️ Dead |
| `NODE_ENV` | ❌ Not used | ✅ Listed | ⚠️ Dead |

- **Issue:** 4 env vars listed in `.env.example` are **never used** in the codebase (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`). These are leftovers from early planning. They create confusion for anyone setting up the project.
- **Fix:** Remove the `DATABASE (Prisma)` and `APP CONFIGURATION` sections from `.env.example`. Keep only the 5 vars that are actually used.

---

### Check 4 — NEXT_PUBLIC_ prefix correctness
- **Status:** ✅ PASS
- **File:** All env usage
- **Finding:**
  - `NEXT_PUBLIC_SUPABASE_URL` — used in browser client ✅ needs `NEXT_PUBLIC_`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — used in browser client ✅ needs `NEXT_PUBLIC_`
  - `SUPABASE_SECRET_KEY` — used in admin.ts (server only) ✅ no `NEXT_PUBLIC_` prefix = never exposed to browser
  - `NEXTAUTH_SECRET` — used by Auth.js internally ✅ server only

---

## 5.3 Auth.js Production Configuration (2/2)

---

### Check 5 — Auth route exists and is correctly configured
- **Status:** ✅ PASS
- **File:** `src/app/api/auth/[...nextauth]/route.ts`
- **Finding:** Exports `{ GET, POST }` from `handlers` in `src/auth.ts`. This is the correct Auth.js v5 pattern for Next.js App Router. ✅

---

### Check 6 — Middleware protects routes correctly
- **Status:** ✅ PASS
- **File:** `src/middleware.ts`
- **Finding:** Middleware checks `auth()` session. Protected paths: `/dashboard`, `/events`, `/people`, `/settings`, `/admin`. Auth paths (`/login`, `/register`) redirect authenticated users to `/dashboard`. Matcher excludes `/api/auth`, `_next/static`, `_next/image`, and static files. ✅
- **Note:** No OAuth providers used — only custom credentials. No callback URL concerns.

---

## 5.4 Vercel Free Tier Sustainability (3/3)

---

### Check 7 — Bandwidth estimation
- **Status:** ✅ PASS
- **Calculation:**

| Page | Est. payload (gzipped) |
|---|---|
| Dashboard | ~80 KB (HTML + JS + CSS) |
| Event detail | ~120 KB (includes chart.js chunk) |
| People list | ~60 KB |
| Settings | ~50 KB |
| **Weighted avg** | **~80 KB** |

**Monthly estimate:** 80 KB × 50 users × 20 views/day × 30 days = **2.4 GB/month**

Vercel free tier: **100 GB/month** → Using **2.4%**. ✅ Very safe.

At 200 users: ~9.6 GB/month → still only **9.6%**. ✅

---

### Check 8 — Serverless function execution
- **Status:** ✅ PASS
- **Calculation:**

| Action | Calls/user/day | Avg duration |
|---|---|---|
| getDashboardData | 3 | ~300ms |
| getEventDetail | 5 | ~400ms |
| createReport | 1 | ~200ms |
| Auth middleware | 10 | ~100ms |
| Other (people, settings) | 2 | ~200ms |
| **Total/user/day** | **21 calls** | **~5s total** |

**Monthly:** 5s × 50 users × 30 days = **7,500 seconds = 2.08 hours**

Vercel free tier: **100 GB-hours** → Using **~2%**. ✅ Very safe.

At 200 users: ~8.3 hours → still only **~8%**. ✅

**Slowest action:** `getEventDetail` — makes 3-5 sequential Supabase queries (event, assignments, reports). At ~400ms total, this is acceptable but could be parallelized for optimization later.

---

### Check 9 — Supabase storage estimation
- **Status:** ✅ PASS
- **Calculation:**
  - Event logos: 20 events × 200 KB avg (compressed WebP) = ~4 MB
  - Avatars: Currently emoji-based (0 storage). If photo avatars added: 50 × 100 KB = ~5 MB
  - **Total: ~4-9 MB** (Supabase free tier: 1 GB) → Using **< 1%**. ✅
- **Note (from Phase 2):** The `uploadEventLogo` function now auto-deletes old logos when a new one is uploaded (fixed earlier), so storage growth is bounded. ✅

---

## 5.5 Git & Repository Hygiene (3/3)

---

### Check 10 — .gitignore coverage
- **Status:** ✅ PASS
- **File:** `.gitignore`
- **Finding:** All critical patterns covered:
  - `.env`, `.env.local`, `.env.*.local` ✅
  - `.next/`, `node_modules/` ✅
  - `build/`, `dist/`, `out/` ✅
  - `.DS_Store`, `.vercel` ✅

---

### Check 11 — Lock file committed
- **Status:** ✅ PASS
- **File:** `package-lock.json` (287 KB)
- **Finding:** Lock file exists and is committed. Ensures reproducible builds on Vercel. ✅

---

### Check 12 — No credential files in repo
- **Status:** ✅ PASS
- **Finding:** No `.env` (without `.example`), `secrets.*`, `config.local.*`, `*.pem`, or `*.key` files found in the project root or `src/`. Only `.env.example` (with placeholder values) is committed. ✅

---

## 5.6 README & Handoff Documentation (0/1)

---

### Check 13 — README.md is production-ready
- **Status:** ❌ FAIL
- **File:** `README.md`
- **Issue:** The README is **heavily outdated** — it was written during the initial frontend-only phase and has not been updated. Specific problems:

| Section | Problem |
|---|---|
| Overview | Says "Auth.js (planned)" — auth is fully implemented |
| Env vars | Shows `NEXT_PUBLIC_SUPABASE_ANON_KEY` — actual var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Env vars | Missing `SUPABASE_SECRET_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` |
| Project structure | Shows old structure (missing `actions/`, `types/`, most `lib/` files) |
| Roadmap | Lists "Backend integration", "Auth implementation", "People page" as TODO — all are done |
| Tech stack | Missing Supabase, bcryptjs |
| Setup | No mention of Supabase project setup or SQL migrations |
| Roles | No explanation of the role system |
| First account | No instructions for creating the first developer/admin account |
| Deployment | No Vercel deployment instructions |

- **Fix:** Complete rewrite needed. See action items below.

---

## 5.7 Pre-Launch Manual Test Checklist (N/A — analysis only)

Based on code review, here is the test matrix with server-side enforcement status:

### As DEVELOPER role:
| Test | Server-side enforced? |
|---|---|
| Can login | ✅ `auth.ts` — credential check |
| Can create event | ✅ `events.ts` — `isAdminOrDev` check |
| Can assign users to event | ✅ `people.ts` — role check |
| Can promote user to admin | ✅ `people.ts:updateUserRole` — `is_developer()` check |
| Can view all reports | ✅ RLS: `is_admin_or_higher()` |

### As ADMIN role:
| Test | Server-side enforced? |
|---|---|
| Can create event | ✅ `events.ts` — `isAdminOrDev` check |
| Can manage people | ✅ `people.ts` — role check |
| CANNOT promote to developer | ✅ RLS: only `is_developer()` can update profiles |
| Can view all reports | ✅ RLS: `is_admin_or_higher()` |

### As USER (unassigned):
| Test | Server-side enforced? |
|---|---|
| Dashboard shows NO events | ✅ `dashboard.ts` — filtered by `event_assignments` |
| Cannot access /events/new | ✅ `events.ts:createEvent` — role check |
| Cannot access /people | ⚠️ **UI-only** — middleware allows `/people` for any logged-in user. The `getPeopleList` action does check role server-side, so data won't load, but the page renders (empty). |

### As USER (advertiser on Event X):
| Test | Server-side enforced? |
|---|---|
| Dashboard shows ONLY Event X | ✅ `dashboard.ts` — filtered by assignment |
| Can submit report for Event X | ✅ `reports.ts` — `is_advertiser_in_event()` check |
| Cannot submit duplicate report | ✅ `reports.ts` — duplicate check + DB UNIQUE constraint |
| Cannot edit another's report | ✅ `reports.ts:updateReport` — `user_id` ownership check + RLS |
| Cannot access Event Y | ✅ RLS: `has_event_access()` returns false |

### As USER (PIC on Event X):
| Test | Server-side enforced? |
|---|---|
| Can view all reports for Event X | ✅ RLS: `has_event_access_via_batch()` |
| Cannot submit reports | ✅ `reports.ts:createReport` — checks `advertiser` role |
| Cannot see Event Y | ✅ RLS: `has_event_access()` returns false |

### Gaps found:
| Gap | Risk | Detail |
|---|---|---|
| ⚠️ `/people` page accessible to non-admin users | Low | Middleware doesn't check role, only auth. The page will render with no data (action checks role), but the page shell is visible. |
| ⚠️ `/events/new` page accessible to non-admin users | Low | Same — middleware allows any authenticated user to visit the URL. The `createEvent` action rejects the submission server-side, but the form is visible. |

**Fix (optional):** Add role checks in middleware for admin-only routes, or add server-side redirects at the page level.

---

## Summary

```
PHASE 5 DEPLOYMENT SCORE: 9/14 checks passed

❌ FAIL   (2):
  1. No security headers in next.config.ts
  2. README.md heavily outdated — not usable for handoff/deployment

⚠️ WARNING (3):
  3. .env.example contains 4 dead env vars (DATABASE_URL, DIRECT_URL, etc.)
  4. /people and /events/new page routes accessible to non-admin users (UI-only, data is protected)
  5. PIC role can see report form page shell even though submit is blocked server-side

✅ PASS (9):
  - Supabase image hostname configured
  - NEXT_PUBLIC_ prefix correct on all vars
  - Auth route exists and configured
  - Middleware protects all routes
  - Bandwidth: ~2.4% of Vercel free tier
  - Serverless: ~2% of Vercel free tier
  - Storage: < 1% of Supabase free tier
  - .gitignore, lock file, no credential leaks
  - All test scenarios have server-side enforcement
```

---

## Action Items (Priority Order)

| Priority | Fix | Effort |
|---|---|---|
| 🔴 HIGH | Add security headers to `next.config.ts` | 5 min |
| 🔴 HIGH | Rewrite `README.md` to reflect current project state | 30 min |
| 🟡 MEDIUM | Clean up `.env.example` — remove dead vars | 2 min |
| 🟢 LOW | Add role redirect in `/people/page.tsx` and `/events/new/page.tsx` | 10 min |

---

## Vercel Deployment Quick Reference

When deploying to Vercel, set these environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_xxxxx` |
| `SUPABASE_SECRET_KEY` | `sb_secret_xxxxx` |
| `NEXTAUTH_SECRET` | Result of `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` |

**That's it — only 5 variables needed.** The `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`, and `NODE_ENV` in `.env.example` are NOT needed.
