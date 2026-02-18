# Divination Dashboard - Project Context & Technical Documentation

## 1. Project Overview
Divination Dashboard is a specialized web application designed for managing event-based marketing campaigns. It allows teams to track "Events", organized into "Batches", and monitor performance through daily "Reports" submitted by advertisers. The system focuses on tracking leads, closing counts, and ad spend to calculate efficiency and results.

## 2. Project Structure

```
├── docs/                # Project documentation
├── public/              # Static assets (images, fonts)
├── src/
│   ├── actions/         # Server Actions (Backend logic & Date mutations)
│   │   ├── events.ts    # Event CRUD operations
│   │   ├── reports.ts   # Report management logic
│   │   └── ...
│   ├── app/             # Application Routes (App Router)
│   │   ├── (auth)/      # Authentication pages (login, register)
│   │   ├── dashboard/   # Dashboard page & client components
│   │   ├── events/      # Event management pages
│   │   ├── people/      # User management pages
│   │   └── api/         # API Routes (if any)
│   ├── components/      # Shared React components
│   │   └── ui/          # Radix primitive / shadcn components
│   ├── lib/             # Utilities and configurations
│   │   ├── supabase/    # Supabase client setup
│   │   └── utils.ts     # Helper functions
│   ├── types/           # TypeScript definitions
│   ├── auth.ts          # Auth.js configuration
│   └── middleware.ts    # Edge middleware
├── supabase/
│   └── migrations/      # Database schema & SQL migrations
├── next.config.js       # Next.js configuration
├── package.json         # Dependencies and scripts
└── tailwind.config.js   # Tailwind CSS configuration
```

## 3. Technology Stack
- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) with RLS (Row Level Security)
- **Authentication**: [Auth.js (NextAuth)](https://authjs.dev/) v5
- **Styling**: Tailwind CSS with `shadcn/ui` components
- **Language**: TypeScript
- **State Management**: React Server Components & Server Actions

## 4. Database Schema
The database is hosted on Supabase and uses PostgreSQL.

### Core Tables

#### `profiles` (extends `auth.users`)
Stores user information and application-level roles.
- `id`: UUID (PK, References `auth.users`)
- `username`: Unique identifier (Email)
- `full_name`: Display name
- `role`: App-level role (`developer`, `admin`, `user`)
- `avatar_url`: Path to avatar image
- `password_hash`: For credential-based auth (bcrypt)

#### `events`
Represents a marketing campaign or event.
- `id`: UUID (PK)
- `name`: Event name
- `logo_url`: Event logo
- `status`: `active`, `completed`, `upcoming`
- `created_by`: Reference to creator profile

#### `batches`
Time-bound segments within an event (e.g., "Batch 1", "Batch 2").
- `id`: UUID (PK)
- `event_id`: Reference to `events`
- `start_date`, `end_date`: Duration
- `name`: Batch name

#### `event_assignments`
Maps users to specific events with a specific role.
- `event_id`: Reference to `events`
- `user_id`: Reference to `profiles`
- `role`: Event-level role (`pic`, `advertiser`)

#### `reports`
Daily performance records submitted by advertisers.
- `id`: UUID (PK)
- `batch_id`: Reference to `batches`
- `user_id`: Reference to `profiles` (Reporter)
- `report_date`: Date of report
- `leads_count`: Number of leads generated
- `closing_count`: Number of sales/closings
- `ads_spent`: Amount spent on ads
- `tax_percentage`: Tax applied (0-100)

## 5. Backend Architecture
The application utilizes Next.js **Server Actions** for all data mutations and fetching, located in `src/app/actions`.

### Key Actions
- **`auth.ts`**: Handles authentication flows.
- **`events.ts`**: CRUD operations for Events.
- **`batches.ts`**: CRUD operations for Batches.
- **`reports.ts`**: Logic for submitting and managing daily reports. Includes validation for roles and data integrity.
- **`dashboard.ts`**: Aggregates data for the main dashboard view.
- **`storage.ts`**: Handles file uploads (images/avatars) to Supabase Storage.

### Security & RLS
- **Supabase RLS**: All tables have Row Level Security enabled.
- **Policies**:
    - `profiles`: Users can read all, update own.
    - `events`: Admins/Developers have full access. Assigned users have read access.
    - `reports`: Advertisers can create/edit their *own* reports. Admins can manage all.
- **Middleware**: `src/middleware.ts` protects routes like `/dashboard`, `/events` ensuring only authenticated users can access them.

## 6. Frontend Architecture
The frontend is built with Next.js App Router, using a mix of Server Components (for data fetching) and Client Components (for interactivity).

### Page Structure (`src/app`)

#### Public
- **`/login`**: Sign-in page.
- **`/register`**: User registration (if enabled).

#### Protected (Layout: `DashboardLayout`)
- **`/dashboard`** (`src/app/dashboard/page.tsx`)
    - **Purpose**: Main landing view. Shows high-level metrics and active events.
    - **Components**: `DashboardClient` (Interactive dashboard UI).
    
- **`/events`**
    - **`/events/[id]`** (`src/app/events/[id]/page.tsx`)
        - **Purpose**: Detailed view of a specific event. Shows batches, assignments, and aggregated statistics.
        - **Components**: `EventDetailClient`.
    - **`/events/new`** (`src/app/events/new/page.tsx`)
        - **Purpose**: Form to create a new event (Admin/Developer only).

- **`/people`** (`src/app/people/page.tsx`)
    - **Purpose**: User management. Lists all users and allows Admins to manage roles.

- **`/settings`** (`src/app/settings/page.tsx`)
    - **Purpose**: User profile settings (avatar, password, etc.).

## 7. Role System
The application implements a dual-layer role system: **App-Level** and **Event-Level**.

### App-Level Roles (`profiles.table`)
Defined globally for the user.
1.  **`developer`**:
    - **Access**: Superuser. Full access to everything.
    - **Capabilities**: Can promote users to Admin. Can bypass all RLS.
2.  **`admin`**:
    - **Access**: High-level management.
    - **Capabilities**: Create Events, Manage Users, View all Reports across all events.
3.  **`user`**:
    - **Access**: Basic access.
    - **Capabilities**: Can only view/act on Events they are explicitly assigned to.

### Event-Level Roles (`event_assignments.table`)
Scoped to specific events. Only relevant for `user` role (Admins/Devs have implicit full access).
1.  **`pic` (Person In Charge)**:
    - **Purpose**: Manager for a specific event.
    - **Capabilities**: Can likely manage batches and view all reports within that event.
2.  **`advertiser`**:
    - **Purpose**: The user running ads.
    - **Capabilities**: Can **submit reports** (Create/Edit) for that specific event's batches. Cannot see other advertisers' detailed data unless aggregated (depending on UI implementation).

### Permission Matrix
| Action | Developer | Admin | User (Unassigned) | User (PIC) | User (Advertiser) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Login** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Event** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage People**| ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Event** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Create Report**| ✅ | ✅ | ❌ | ❌ | ✅ (Own) |
| **View Reports** | ✅ | ✅ | ❌ | ✅ (All in Event)| ✅ (Own only*) |

*\*Visibility of others' reports depends on specific RLS/UI logic, but generally Advertisers focus on their own data.*
