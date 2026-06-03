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
| `20260207_remove_auth_users_fk.sql` | Removes the foreign key to `auth.users` on `profiles.id` because we use Auth.js Credentials |
| `20260207_add_password_hash.sql` | Adds `password_hash` column to the `profiles` table |
| `20260207_add_emoji_avatar.sql` | Adds `emoji` column for profile avatars |
| `20260210_storage_bucket.sql` | Configures the `uploads` storage bucket for logo uploads |
| `20260210_batch_nullable_end_date.sql` | Makes the `end_date` column in `batches` table nullable |
| `20260218_report_tax_percentage.sql` | Adds a `tax_percentage` column to the `reports` table |
| `20260303_batch_price.sql` | Adds a `price` (cost) column to the `batches` table |
| `20260407_add_oauth_identities.sql` | Creates the `oauth_identities` table for Facebook integration |
| `20260522_add_facebook_access_token.sql` | Adds access token and expiration columns to `oauth_identities` |
| `20260603_budget_requests.sql` | Creates the `budget_requests` table and its status enum |

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
1. Start the Next.js development server: `npm run dev`
2. Open `http://localhost:3000/register` in your browser and register an account (it gets created with `user` role)
3. To promote your account to a Developer/Admin, run this in the Supabase SQL Editor:
   ```sql
   UPDATE profiles SET role = 'developer' WHERE username = 'your-email@example.com';
   ```
4. Log out of the web app and log back in for the role update to take effect
5. You can now manage events, batches, users, and view reports!
