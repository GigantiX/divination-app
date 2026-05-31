# Divination Dashboard — Project Context & Implementation Reference

> **Status: Production-Ready**
> This document reflects the **current implemented state** of the project. Use it as AI context for future development.

---

## 1. Project Overview

**Divination Dashboard** adalah aplikasi web manajemen event dan pelaporan kinerja Meta Ads. Digunakan oleh tim marketing untuk melacak performa iklan harian (leads, closing, ad spend + pajak) per event dan batch.

- **Language:** TypeScript (strict)
- **Framework:** Next.js 15 App Router
- **Database:** Supabase (PostgreSQL)
- **Auth:** Auth.js v5 (NextAuth) with custom credential provider
- **Styling:** Tailwind CSS + shadcn/ui components
- **Design:** Mobile-first (70% mobile users), Indonesian language UI

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Next.js Server Actions (`'use server'`) |
| Database | Supabase (PostgreSQL) |
| Auth | Auth.js v5 (NextAuth) — custom credentials |
| Password | bcryptjs (hash + verify) |
| Storage | Supabase Storage (event logos, avatars) |
| Icons | Lucide React |

---

## 3. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=                    # Service role key (server-only)

# Database (Prisma-style URLs, used for direct DB access)
DATABASE_URL=                           # Pooler (transaction mode)
DIRECT_URL=                             # Direct (session mode)

# Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                        # openssl rand -base64 32

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

> **Security:** `.env.local` is gitignored. Never commit real secrets. `SUPABASE_SECRET_KEY` is only used server-side via `createAdminClient()`.

---

## 4. Database Schema

### Tables

#### `profiles`
Extends Supabase `auth.users`. Stores app-level user data.

```sql
id          UUID PRIMARY KEY  -- references auth.users(id)
username    TEXT UNIQUE NOT NULL
full_name   TEXT NOT NULL
role        user_role NOT NULL DEFAULT 'user'  -- 'developer' | 'admin' | 'user'
emoji       TEXT               -- emoji avatar (e.g. "🦊")
avatar_url  TEXT               -- optional uploaded photo
password_hash TEXT             -- bcrypt hash for custom auth
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

#### `events`
Top-level marketing events.

```sql
id          UUID PRIMARY KEY
name        TEXT NOT NULL
logo_url    TEXT               -- Supabase Storage URL
status      event_status       -- 'active' | 'completed' | 'upcoming'
created_by  UUID REFERENCES profiles(id)
created_at  TIMESTAMPTZ
```

#### `batches`
A batch is a campaign period within an event (e.g. "Batch 1 - Jan 2026").

```sql
id          UUID PRIMARY KEY
event_id    UUID REFERENCES events(id) ON DELETE CASCADE
name        TEXT NOT NULL
start_date  DATE NOT NULL
end_date    DATE               -- nullable (ongoing batches)
notes       TEXT
created_at  TIMESTAMPTZ
```

#### `event_assignments`
Maps users to events with a specific role.

```sql
id          UUID PRIMARY KEY
event_id    UUID REFERENCES events(id) ON DELETE CASCADE
user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE
role        event_role         -- 'pic' | 'advertiser'
created_at  TIMESTAMPTZ
UNIQUE(event_id, user_id)
```

#### `reports`
Daily ad performance reports submitted by advertisers.

```sql
id              UUID PRIMARY KEY
batch_id        UUID REFERENCES batches(id) ON DELETE CASCADE
user_id         UUID REFERENCES profiles(id)
report_date     DATE NOT NULL
leads_count     INTEGER NOT NULL DEFAULT 0
closing_count   INTEGER NOT NULL DEFAULT 0
ads_spent       DECIMAL(15,2) NOT NULL DEFAULT 0   -- raw spend before tax
tax_percentage  DECIMAL(5,2) NOT NULL DEFAULT 11   -- Meta Ads tax (PPN)
notes           TEXT
created_at      TIMESTAMPTZ
CONSTRAINT valid_counts CHECK (leads_count >= 0 AND closing_count >= 0)
CONSTRAINT valid_ads_spent CHECK (ads_spent >= 0)
CONSTRAINT valid_tax_percentage CHECK (tax_percentage >= 0 AND tax_percentage <= 100)
```

> **Tax note:** `ads_spent` stores the raw (pre-tax) value. All display calculations use `spend_with_tax = ads_spent * (1 + tax_percentage / 100)`. CPL is also computed on the taxed spend.

### Migrations (in order)

| File | Description |
|---|---|
| `20260206_initial_schema.sql` | All tables, enums, indexes, RLS policies |
| `20260206_seed_data.sql` | Initial seed data |
| `20260207_add_emoji_avatar.sql` | Add `emoji` column to profiles |
| `20260207_add_password_hash.sql` | Add `password_hash` column to profiles |
| `20260207_remove_auth_users_fk.sql` | Remove FK to auth.users for custom auth |
| `20260210_batch_nullable_end_date.sql` | Make `end_date` nullable on batches |
| `20260210_storage_bucket.sql` | Create Supabase Storage buckets |
| `20260218_report_tax_percentage.sql` | Add `tax_percentage` column to reports |

---

## 5. Role System

### App-Level Roles (`profiles.role`)

| Role | Description | Capabilities |
|---|---|---|
| `developer` | Super admin | Everything — same as admin + system access |
| `admin` | Event manager | Create events/batches, manage users, view all reports |
| `user` | Default new user | Can only see assigned events, submit reports |

### Event-Level Roles (`event_assignments.role`)

| Role | Description |
|---|---|
| `pic` | Person In Charge — manages the event |
| `advertiser` | Runs ads — submits daily reports |

> A `user` with no event assignment sees an empty dashboard and is directed to contact admin.

---

## 6. Authentication

- **Provider:** Custom credentials (username + password)
- **Password:** Stored as bcrypt hash in `profiles.password_hash`
- **Session:** JWT via Auth.js v5
- **Middleware:** `src/middleware.ts` — redirects unauthenticated users to `/login`
- **Session data:** `session.user.id`, `session.user.name`, `session.user.role`, `session.user.emoji`

### Key files
- `src/auth.ts` — Auth.js config, credentials provider, JWT/session callbacks
- `src/middleware.ts` — Route protection
- `src/lib/password.ts` — `hashPassword()`, `verifyPassword()` using bcryptjs
- `src/app/actions/auth.ts` — `loginAction`, `registerAction`, `logoutAction`

---

## 7. Project Structure

```
src/
├── app/
│   ├── actions/              # All server actions (backend logic)
│   │   ├── auth.ts           # Login, register, logout
│   │   ├── batches.ts        # CRUD for batches
│   │   ├── dashboard.ts      # Fetch events for dashboard
│   │   ├── event-detail.ts   # Full event detail data (stats, reports, advertisers)
│   │   ├── events.ts         # CRUD for events
│   │   ├── people.ts         # User management (list, assign, revoke, role update)
│   │   ├── profile.ts        # Edit profile (name, emoji, avatar)
│   │   ├── reports.ts        # CRUD for reports (with tax)
│   │   ├── settings.ts       # Change password, help contacts
│   │   └── storage.ts        # File upload to Supabase Storage
│   │
│   ├── dashboard/            # /dashboard — event list
│   ├── events/
│   │   ├── new/              # /events/new — create event form
│   │   └── [id]/
│   │       ├── page.tsx      # /events/:id — event detail (tabs: Overview, Reports)
│   │       ├── event-detail-client.tsx
│   │       ├── batches/new/  # /events/:id/batches/new — create batch
│   │       └── reports/
│   │           ├── new/      # /events/:id/reports/new?batch=:batchId
│   │           └── [reportId]/edit/  # /events/:id/reports/:id/edit
│   │
│   ├── login/                # /login
│   ├── register/             # /register
│   ├── people/               # /people — user list (admin only)
│   │   ├── [id]/             # /people/:id — user detail + role management
│   │   └── [id]/assign/      # /people/:id/assign — assign to event
│   │
│   └── settings/             # /settings
│       ├── change-password/  # /settings/change-password
│       ├── edit-profile/     # /settings/edit-profile
│       └── help/             # /settings/help — contact admin/developer
│
├── auth.ts                   # Auth.js v5 config
├── middleware.ts              # Route protection
│
├── components/ui/
│   ├── avatar-emoji.tsx      # Emoji avatar component
│   ├── bottom-nav.tsx        # Mobile bottom navigation
│   ├── role-badge.tsx        # Role chip display
│   └── [shadcn components]   # button, card, input, label, tabs, etc.
│
├── lib/
│   ├── emojis.ts             # Emoji list for avatar selection
│   ├── image.ts              # Image upload/resize utilities
│   ├── password.ts           # hashPassword, verifyPassword
│   └── supabase/
│       ├── admin.ts          # createAdminClient() — service role
│       ├── client.ts         # createClient() — anon key (browser)
│       ├── server.ts         # createServerClient() — server-side
│       └── jwt.ts            # JWT decode utility
│
└── types/
    └── next-auth.d.ts        # Extended session/JWT types
```

---

## 8. Server Actions Reference

All server actions are in `src/app/actions/`. They use `createAdminClient()` (service role) for DB access and `auth()` for session.

### `auth.ts`
| Function | Description |
|---|---|
| `loginAction(username, password)` | Verify credentials, call `signIn()` |
| `registerAction(username, fullName, password)` | Create profile + auth user |
| `logoutAction()` | Call `signOut()` |

### `events.ts`
| Function | Description |
|---|---|
| `getEvents()` | List events (admin: all, user: assigned only) |
| `createEvent(input)` | Admin only. Creates event + uploads logo |
| `updateEvent(id, input)` | Admin only. Update name/status/logo |
| `deleteEvent(id)` | Admin only |

### `batches.ts`
| Function | Description |
|---|---|
| `getBatch(batchId)` | Get single batch by ID |
| `createBatch(input)` | Admin only. Create batch for event |
| `updateBatch(id, input)` | Admin only |
| `deleteBatch(id)` | Admin only |

### `event-detail.ts`
| Function | Description |
|---|---|
| `getEventDetail(eventId, batchId?)` | Full event data: stats, advertisers, reports, batches list |

> **Spend calculation:** All spend values in event-detail are returned as `spend_with_tax = ads_spent * (1 + tax_percentage / 100)`. CPL = `spend_with_tax / leads`.

### `reports.ts`
| Function | Description |
|---|---|
| `createReport(input)` | Advertiser/Admin. Validates no duplicate per day per batch |
| `getReport(reportId)` | Get single report (auth required) |
| `updateReport(reportId, input)` | Owner or Admin/Dev only |
| `deleteReport(reportId)` | Owner or Admin/Dev only |

**`CreateReportInput`:**
```typescript
{
  batchId: string
  reportDate: string        // YYYY-MM-DD
  leadsCount: number
  closingCount: number      // must be <= leadsCount
  adsSpent: number          // raw, before tax
  taxPercentage: number     // 0-100, default 11 (PPN Indonesia)
  notes?: string
}
```

### `people.ts`
| Function | Description |
|---|---|
| `getPeopleList()` | Admin/Dev only. All users with stats |
| `getUserDetail(userId)` | Admin/Dev only. User + assigned events |
| `getAssignableEvents(userId)` | Events user is not yet assigned to |
| `assignUserToEvent(userId, eventId, role)` | Admin/Dev only |
| `revokeAssignment(userId, eventId)` | Admin/Dev only |
| `updateUserRole(userId, role)` | Admin/Dev only |

### `settings.ts`
| Function | Description |
|---|---|
| `changePassword(input)` | Verify current password, hash new, update DB |
| `getHelpContacts()` | Returns list of admin + developer users |

### `profile.ts`
| Function | Description |
|---|---|
| `updateProfile(input)` | Update full_name, emoji, avatar_url |

### `storage.ts`
| Function | Description |
|---|---|
| `uploadEventLogo(file)` | Upload to `event-logos` bucket |
| `uploadAvatar(file)` | Upload to `avatars` bucket |

---

## 9. Page Routes & Access Control

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Login with username + password |
| `/register` | Public | Create new account (role defaults to `user`) |
| `/dashboard` | Auth required | Event list. Admin sees all, users see assigned |
| `/events/new` | Admin only | Create new event with logo upload |
| `/events/:id` | Assigned users + Admin | Event detail: Overview tab + Reports tab |
| `/events/:id/batches/new` | Admin only | Create new batch |
| `/events/:id/reports/new` | Advertiser + Admin | Add daily report (requires `?batch=:batchId`) |
| `/events/:id/reports/:id/edit` | Owner + Admin/Dev | Edit or delete a report |
| `/people` | Admin/Dev only | User list with search |
| `/people/:id` | Admin/Dev only | User detail, role management |
| `/people/:id/assign` | Admin/Dev only | Assign user to event |
| `/settings` | Auth required | Settings menu |
| `/settings/edit-profile` | Auth required | Edit name, emoji, avatar |
| `/settings/change-password` | Auth required | Change password |
| `/settings/help` | Auth required | Contact admin/developer |

---

## 10. Key Business Logic

### Tax Calculation
- Meta Ads charges tax on top of ad spend
- Tax options in UI: **4%**, **11% (default, Indonesian PPN)**, **Custom (0-100%)**
- `ads_spent` in DB = raw spend (before tax)
- All dashboard/report displays show: `ads_spent * (1 + tax_percentage / 100)`
- CPL = `spend_with_tax / leads_count`

### Report Rules
- One report per user per batch per day (duplicate check enforced server-side)
- `closing_count` cannot exceed `leads_count` (validated both client + server)
- Only the report owner, Admin, or Developer can edit/delete

### Batch System
- Events can have multiple batches (campaign periods)
- Event detail page shows data filtered by the selected batch
- `end_date` is nullable (for ongoing batches)
- Reports belong to a batch, not directly to an event

### User Assignment Flow
1. User registers → role = `user`, no event access
2. Admin goes to `/people/:id/assign` → assigns user to event with role (`pic` or `advertiser`)
3. User now sees the event on their dashboard
4. Admin can revoke or change role at any time

---

## 11. Navigation

### Bottom Nav (Mobile)
- **Admin/Developer:** Home | People | Settings
- **User:** Home | Settings

### Event Detail Tabs
- **Overview:** Summary stats (total spend+tax, leads, sales, CPL), advertiser performance list
- **Reports:** Full report history for the selected batch, with edit access for owners/admins

---

## 12. UI Conventions

- **Language:** Indonesian (Bahasa Indonesia) for all UI text
- **Currency:** IDR formatted with `.` thousands separator (e.g. `Rp 1.500.000`)
- **Dates:** Jakarta timezone (WIB, UTC+7)
- **Avatars:** Emoji-based (`profiles.emoji`), optional photo upload
- **Colors:**
  - Primary: Blue (`#3B82F6`)
  - Secondary: Violet (`#8B5CF6`)
  - Success: Emerald (`#10B981`)
  - Warning: Amber (`#F59E0B`)
  - Tax chips: Amber (`bg-amber-500`)
- **Chip selectors:** Rounded-full pill buttons for date options, tax options
- **Forms:** All inputs 48px height (touch-friendly), `h-12` class

---

## 13. Supabase Client Usage

| Client | File | When to use |
|---|---|---|
| `createAdminClient()` | `src/lib/supabase/admin.ts` | All server actions (bypasses RLS) |
| `createClient()` | `src/lib/supabase/client.ts` | Browser-side (respects RLS) |
| `createServerClient()` | `src/lib/supabase/server.ts` | Server components (respects RLS) |

> All server actions use `createAdminClient()` with the service role key. Access control is enforced manually in the action code (check session + role).

---

## 14. Development Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build (verify before deploy)
npm run lint      # ESLint check
```

### Git Branches
- `main` — production branch
- `staging` — development/staging branch
- Always commit to `staging`, then merge to `main` when ready

### Supabase Migrations
Run migrations manually in Supabase SQL Editor or via Supabase CLI:
```bash
supabase db push   # Push local migrations to remote
```
Migration files are in `supabase/migrations/` — run in chronological order.
