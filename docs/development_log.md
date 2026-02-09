# Development Log

## Latest Updates (Feb 10, 2026)

### Event Detail Page
- **Full Backend Integration** - Fetches real data from database
- **Overview Tab** - Stats grid, 7-day chart, advertisers, PICs
- **Reports Tab** - Daily reports list with reporter info
- **Role-Based UI** - Menu/FAB visibility based on user role

### Add New Batch
- **Create Batch Action** - Saves to database with validation
- **Optional End Date** - "Batch Aktif Terus" toggle for ongoing batches
- **Role-Based Access** - Admin/Developer/PIC only

### Dashboard Backend
- **Event Cards** - Syncs with database (name, logo, batch count, status)
- **Role Badge** - Developer (purple), Admin (blue), User (green)
- **Status Toggle** - Active/inactive event toggle
- **Empty State** - Shows when user has no assigned events

### Add Event with Logo Upload
- **Create Event Action** - Saves to database
- **Image Compression** - 512×512 WebP, 80% quality
- **5MB Limit** - With validation and error handling
- **Supabase Storage** - For logo uploads

---

## Previous Updates (Feb 9, 2026)

### Settings & Profile Features
- **Emoji Avatars** - Profile pics replaced with emoji (136 options)
- **Edit Profile Page** - `/settings/edit-profile` with display name
- **Settings Backend** - Syncs with Supabase (name, email, emoji)

### Authentication (Auth.js v5)
- **Credentials Provider** - Email/password login with bcrypt
- **JWT Sessions** - 7-day duration
- **Auto-login** - After registration → Dashboard
- **Indonesian Messages** - All error/success text in Indonesian

---

## File Structure

### Server Actions
| File | Purpose |
|------|---------|
| `src/app/actions/auth.ts` | Login/register/logout |
| `src/app/actions/profile.ts` | Profile CRUD |
| `src/app/actions/dashboard.ts` | Dashboard data fetching |
| `src/app/actions/events.ts` | Event CRUD |
| `src/app/actions/event-detail.ts` | Event detail + chart data |
| `src/app/actions/batches.ts` | Batch CRUD |
| `src/app/actions/storage.ts` | Supabase Storage uploads |

### Auth & Profile
| File | Purpose |
|------|---------|
| `src/auth.ts` | Auth.js config with Credentials provider |
| `src/lib/password.ts` | bcrypt password utilities |
| `src/lib/supabase/admin.ts` | Admin client (bypasses RLS) |
| `src/components/ui/avatar-emoji.tsx` | Emoji avatar component |
| `src/components/ui/role-badge.tsx` | Role badge component |

### Event Pages
| File | Purpose |
|------|---------|
| `src/app/dashboard/page.tsx` | Dashboard server component |
| `src/app/dashboard/dashboard-client.tsx` | Dashboard UI |
| `src/app/events/new/page.tsx` | Create event with logo |
| `src/app/events/[id]/page.tsx` | Event detail server component |
| `src/app/events/[id]/event-detail-client.tsx` | Event detail UI |
| `src/app/events/[id]/batches/new/page.tsx` | Create batch |

---

## Database Migrations

Run in order in Supabase SQL Editor:

1. `20260206_initial_schema.sql` - Base tables
2. `20260207_add_password_hash.sql` - Add password_hash column
3. `20260207_remove_auth_users_fk.sql` - Remove auth.users FK
4. `20260207_add_emoji_avatar.sql` - Replace avatar_url with emoji
5. `20260210_storage_bucket.sql` - Create uploads bucket
6. `20260210_batch_nullable_end_date.sql` - Allow NULL end_date

---

## Role-Based Permissions

| Feature | Developer | Admin | PIC | Advertiser |
|---------|-----------|-------|-----|------------|
| View all events | ✅ | ✅ | ❌ | ❌ |
| Create event | ✅ | ✅ | ❌ | ❌ |
| Add batch | ✅ | ✅ | ✅ | ❌ |
| Event settings | ✅ | ✅ | ✅ | ❌ |
| Add report | ✅ | ✅ | ❌ | ✅ |
| View People tab | ✅ | ✅ | ❌ | ❌ |

---

## Build Status

```
✓ Compiled successfully (Next.js 16.1.6 Turbopack)
✓ TypeScript passed
✓ 17 pages generated (12 static, 5 dynamic)
```

---

## Commits

| Date | Commit | Description |
|------|--------|-------------|
| Feb 10 | - | Event detail + add batch |
| Feb 10 | `0aaac05` | Dashboard backend, add event, logo upload |
| Feb 9 | `b80a2f6` | Settings backend + edit profile page |
| Feb 9 | `3e4bf85` | Emoji avatars replacing profile pics |
| Feb 7 | - | Auth.js v5 implementation |
