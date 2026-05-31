# Project Tasks

## Authentication ✅
- [x] Auth.js v5 with Credentials provider
- [x] bcrypt password hashing
- [x] 7-day JWT sessions
- [x] Login/register/logout server actions
- [x] Indonesian error messages
- [x] Auto-login after registration

## Emoji Avatars ✅
- [x] Remove avatar_url, add emoji column
- [x] Create 136 emoji constants (faces, animals, objects)
- [x] Create AvatarEmoji component with size variants
- [x] Update register action with random emoji
- [x] Settings page emoji picker with category tabs
- [x] People list using emoji avatars

## Settings Page ✅
- [x] Backend sync with database (name, email, emoji)
- [x] Remove "Pengaturan" header
- [x] Remove version info
- [x] Emoji picker modal
- [x] Logout functionality

## Edit Profile ✅
- [x] Edit profile page at `/settings/edit-profile`
- [x] Display name field (2-100 chars)
- [x] Save to database
- [x] Success feedback and redirect

## Dashboard ✅
- [x] Backend sync with database
- [x] Role badge component (Developer/Admin/User)
- [x] Event cards with real data
- [x] Batch count from database
- [x] Status toggle (active/inactive)
- [x] Empty state for unassigned users
- [x] Header with emoji avatar

## Create Event ✅
- [x] Create event server action
- [x] Logo upload with compression (512×512 WebP)
- [x] 5MB file size limit
- [x] Image preview and clear button
- [x] Supabase Storage integration
- [x] Validation and error handling

## Event Detail ✅
- [x] Server component with data fetching
- [x] Overview tab (stats, chart, advertisers, PICs)
- [x] Reports tab (daily reports list)
- [x] Batch selector with loading spinner
- [x] 7-day leads/sales chart
- [x] Role-based UI (menu, FAB)
- [x] Empty states

## Add Batch ✅
- [x] Create batch server action
- [x] Form with name, dates, notes
- [x] Optional end date (ongoing batches)
- [x] "Batch Aktif Terus" toggle
- [x] Role-based access (Admin/Dev/PIC)
- [x] Auto-redirect after creation

## Add Report ✅
- [x] Create report server action
- [x] Form with date/spend/leads/closing
- [x] CPL & Conversion visualization
- [x] Role-based access (Admin/Dev/Advertiser)
- [x] Prevent duplicate reports for same date

## Edit Report ✅
- [x] Update/Delete report server actions
- [x] Edit form with pre-filled data
- [x] Ownership check (can only edit own reports unless Admin)
- [x] Delete confirmation dialog
- [x] Navigation back to correct batch

## Pending Database Migrations
Run in Supabase SQL Editor:
- [x] `20260207_add_password_hash.sql`
- [x] `20260207_remove_auth_users_fk.sql`
- [x] `20260207_add_emoji_avatar.sql`
- [x] `20260210_storage_bucket.sql`
- [x] `20260210_batch_nullable_end_date.sql`
