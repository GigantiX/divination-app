# Divination Dashboard

A mobile-first dashboard for managing advertising events, tracking leads/sales, managing campaign budgets, and analyzing overall performance.

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
| Auth.js v5 | Authentication (JWT, Credentials, OAuth) |
| Tailwind CSS | Styling |
| Chart.js | Data visualization |
| bcryptjs | Password hashing |
| Lucide React | Icons |
| shadcn/ui | UI components (Radix primitives) |

## Key Features
- **Event & Batch Management:** Track active advertising events and organize them by temporal batches.
- **Role-Based Access Control (RBAC):** Strict isolation between Developers, Admins, and standard Users using Supabase Row Level Security.
- **Budget Request System:** Advertisers can request ad budgets directly. Admins/Developers utilize a Queue system to approve requests and securely upload compressed image proofs of transfer.
- **Daily Report Tracking:** Track leads, closings, ad spend, and calculate taxes across campaigns.
- **Facebook Meta Integration:** OAuth integration to securely link Facebook profiles and manage ad accounts.

## Role System

### Global Roles (in `profiles` table)

| Role | Can do |
|---|---|
| **Developer** | Everything. Can promote users to admin. Access to all queues and apps. |
| **Admin** | Create events, manage people, view all reports, approve budget requests. |
| **User** | Can only access assigned events and submit their own budget requests/reports. |

### Event Roles (in `event_assignments` table)

| Role | Can do within an event |
|---|---|
| **PIC** | View all reports, manage batches for assigned event |
| **Advertiser** | Submit and edit own daily reports and request event budgets |

## Getting Started

### Prerequisites

- Node.js 18.17+
- A [Supabase](https://supabase.com) project (free tier works)
- Optional: Facebook Developer App (for OAuth integration)

### 1. Clone & Install

```bash
git clone git@github.com:GigantiX/divination-app.git
cd divination-app
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Go to **SQL Editor** and run the following migration files in chronological order (located in `supabase/migrations/`):
   - `20260206_initial_schema.sql` — Base tables, RLS, and indexes
   - `20260207_remove_auth_users_fk.sql` — Removes auth.users FK constraint since we use credentials auth
   - `20260207_add_password_hash.sql` — Adds password hashing field for credentials auth
   - `20260207_add_emoji_avatar.sql` — Adds random emoji avatar field
   - `20260210_storage_bucket.sql` — Creates bucket for media uploads
   - `20260210_batch_nullable_end_date.sql` — Makes batch end date nullable
   - `20260218_report_tax_percentage.sql` — Adds tax field to reports
   - `20260303_batch_price.sql` — Adds price/cost tracking for batches
   - `20260407_add_oauth_identities.sql` — Creates identity linking for Facebook connect
   - `20260522_add_facebook_access_token.sql` — Adds access token columns for Facebook
   - `20260603_budget_requests.sql` — Creates budget request workflow tables
3. Go to **Settings → API** and copy your keys

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```env
# Supabase (from Settings → API → "API Keys" tab)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx

# Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Facebook Connect & Ads API (Optional, for Facebook spend auto-import)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CONFIG_ID=your_configuration_id
APP_BASE_URL=http://localhost:3000
```

> **Note:** Ignore `DATABASE_URL`/`DIRECT_URL` in `.env.example` unless you are running external database migrations directly. They are unused by the Next.js application itself.

### 4. Create First Account

```bash
npm run dev
```

1. Open `http://localhost:3000/register`
2. Register an account — it will be created with the `user` role.
3. To make yourself a developer, run this in the Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'developer' WHERE username = 'your@email.com';
```

4. Log out and log back in for the role change to take effect.

## Deployment (Vercel)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables (use production Supabase URL and set `NEXTAUTH_URL` to your Vercel domain)
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── actions/         # Server Actions (database, budget & auth logic)
│   │   ├── budget.ts    # Budget request server actions
│   │   ├── facebook-ads.ts # Facebook Ads Graph API actions
│   │   └── ...
│   ├── api/
│   │   ├── auth/        # Auth.js route handler
│   │   └── facebook/    # Facebook connection callback and OAuth connect routes
│   ├── apps/            # Custom mini-apps (Budget Requests, Lead Database WIP)
│   ├── dashboard/       # Main overview dashboard
│   ├── events/          # Event management and reporting
│   ├── people/          # RBAC and user assignments
│   ├── settings/        # Profile and integrations
│   ├── login/           # Login page
│   ├── register/        # Registration page
│   ├── error.tsx        # Root error boundary
│   ├── global-error.tsx # Layout-level error boundary
│   └── not-found.tsx    # Custom 404
├── components/ui/       # Reusable UI components (shadcn/ui & navigation layouts)
├── lib/
│   ├── supabase/        # Supabase clients (admin, server, browser, JWT)
│   ├── facebook-oauth.ts # Facebook OAuth state helpers
│   ├── image.ts         # Image utilities
│   ├── image-compression.ts # Image compression helper
│   ├── password.ts      # bcrypt helpers
│   └── emojis.ts        # Emoji avatar system
├── types/               # TypeScript declarations
├── auth.ts              # Auth.js core config (JWT, credentials logic)
└── middleware.ts        # Route protection
```

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code |
| `staging` | Development and testing |
| `audit-app` | Security audit branch / Active development |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run linter |

---

Built with ❤️ by GigantiX
