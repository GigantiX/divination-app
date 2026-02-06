# Supabase Migrations

This directory contains SQL migration files for the Divination Dashboard database schema.

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Supabase project created
- Environment variables configured in `.env.local`

## Migration Files

| File | Description |
|------|-------------|
| `20260206_initial_schema.sql` | Complete database schema with tables, ENUMs, RLS, functions, and indexes |
| `20260206_seed_data.sql` | Sample data for development/testing (optional) |

## Running Migrations

### Option 1: Via Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the content of `20260206_initial_schema.sql`
5. Click **Run**
6. Verify tables are created: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`

### Option 2: Via Supabase CLI

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

### Option 3: Direct SQL Editor

```bash
# Run migration file directly
psql $DATABASE_URL < supabase/migrations/20260206_initial_schema.sql
```

## Seed Data (Optional)

To populate the database with sample data for testing:

1. First, create test users via **Supabase Auth Dashboard**
2. Copy their UUIDs from the `auth.users` table
3. Edit `20260206_seed_data.sql` and replace all `replace-with-xxx-id` placeholders
4. Uncomment the INSERT statements
5. Run the seed migration via SQL Editor

## Schema Overview

### Tables

- `profiles` - User profiles (extends auth.users)
- `events` - Marketing events/campaigns
- `batches` - Time-based segments within events
- `event_assignments` - User-to-event assignments with roles
- `reports` - Daily performance reports from advertisers

### ENUMs

- `user_role` - App-level permissions (developer, admin, user)
- `event_status` - Event lifecycle status (active, completed, upcoming)
- `event_role` - Event-specific roles (pic, advertiser)

### Security

All tables have Row Level Security (RLS) enabled with policies for:
- Developers: Full access
- Admins: Manage events and users
- Users: Access only assigned events

## Verification

After running migrations, verify:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check functions
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
```

## Troubleshooting

### Permission Denied

If you get permission errors, ensure:
- You're authenticated: `supabase login`
- Your project is linked: `supabase link --project-ref xxx`
- You have database access in Supabase settings

### Duplicate Object Errors

If re-running migrations, drop existing objects:

```sql
-- Drop all tables (WARNING: This deletes all data)
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS event_assignments CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop ENUMs
DROP TYPE IF EXISTS event_role CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
```

## Next Steps

After migrations:
1. Create your first admin user via Supabase Auth
2. Insert admin profile: `INSERT INTO profiles (id, username, full_name, role) VALUES (auth.uid(), 'admin', 'Admin User', 'admin');`
3. Test auth in your Next.js app
4. Start creating events and assigning users
