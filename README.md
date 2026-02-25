# Divination Dashboard

A mobile-first dashboard for managing advertising events, tracking leads/sales, and analyzing campaign performance.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-2.x-3ecf8e?logo=supabase)
![Auth.js](https://img.shields.io/badge/Auth.js-v5-purple)

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16 (App Router) | Framework + Server Actions |
| TypeScript (strict) | Type safety |
| Supabase | Database (Postgres) + Storage + RLS |
| Auth.js v5 | Authentication (JWT + Credentials) |
| Tailwind CSS | Styling |
| Chart.js | Data visualization |
| bcryptjs | Password hashing |
| Lucide React | Icons |
| shadcn/ui | UI components (Radix primitives) |

## Role System

### Global Roles (in `profiles` table)

| Role | Can do |
|---|---|
| **Developer** | Everything. Can promote users to admin. |
| **Admin** | Create events, manage people, view all reports. Cannot promote to developer. |
| **User** | Can only access assigned events. |

### Event Roles (in `event_assignments` table)

| Role | Can do within an event |
|---|---|
| **PIC** | View all reports, manage batches for assigned event |
| **Advertiser** | Submit and edit own daily reports |

## Getting Started

### Prerequisites

- Node.js 18.17+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & Install

```bash
git clone git@github.com:GigantiX/divination-app.git
cd divination-app
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Go to **SQL Editor** and run the migration files in order:
   - `supabase/migrations/20260206_initial_schema.sql` — tables, RLS, indexes
   - `supabase/migrations/20260210_storage_bucket.sql` — storage bucket for logos
   - `supabase/migrations/20260218_report_tax_percentage.sql` — tax column
3. Go to **Settings → API** and copy your keys

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Supabase (from Settings → API → "API Keys" tab)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx

# Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
```

> **Only these 5 variables are needed.** Ignore `DATABASE_URL`/`DIRECT_URL` in `.env.example` — they are unused.

### 4. Create First Account

```bash
npm run dev
```

1. Open `http://localhost:3000/register`
2. Register an account — it will be created with `user` role
3. To make yourself a developer, run this in Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'developer' WHERE username = 'your@email.com';
```

4. Log out and log back in for the role change to take effect

### 5. Start Using

- Create events from the dashboard
- Add batches to events
- Assign users as PIC or Advertiser via the People page
- Advertisers submit daily reports

## Deployment (Vercel)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables (same 5 as above, but use production Supabase URL and set `NEXTAUTH_URL` to your Vercel domain)
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── actions/         # Server Actions (all backend logic)
│   ├── api/auth/        # Auth.js route handler
│   ├── dashboard/       # Main dashboard
│   ├── events/          # Event pages (detail, edit, reports)
│   ├── people/          # User management
│   ├── settings/        # Profile settings
│   ├── login/           # Login page
│   ├── register/        # Registration page
│   ├── error.tsx        # Root error boundary
│   ├── global-error.tsx # Layout-level error boundary
│   └── not-found.tsx    # Custom 404
├── components/ui/       # Reusable UI components (shadcn/ui)
├── lib/
│   ├── supabase/        # Supabase clients (admin, server, browser)
│   ├── image.ts         # Image compression utilities
│   ├── password.ts      # bcrypt helpers
│   └── emojis.ts        # Emoji avatar system
├── types/               # TypeScript declarations
└── middleware.ts        # Auth route protection
```

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code |
| `staging` | Development and testing |
| `audit-app` | Security audit branch |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run linter |

---

Built with ❤️ by GigantiX
