# Development Log

## Latest Updates (Feb 2026)

### Settings & Profile Features
- **Emoji Avatars** - Profile pics replaced with emoji (136 options: faces, animals, objects)
- **Edit Profile Page** - `/settings/edit-profile` with display name field
- **Settings Backend** - Syncs with Supabase (name, email, emoji)
- **Profile Actions** - `getProfile()`, `updateDisplayName()`, `updateEmoji()`

### Authentication (Auth.js v5)
- **Credentials Provider** - Email/password login with bcrypt
- **JWT Sessions** - 7-day duration
- **Auto-login** - After registration → Dashboard
- **Indonesian Messages** - All error/success text in Indonesian

---

## File Structure

### Auth System
| File | Purpose |
|------|---------|
| `src/auth.ts` | Auth.js config with Credentials provider |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth API routes |
| `src/app/actions/auth.ts` | Login/register/logout server actions |
| `src/lib/password.ts` | bcrypt password utilities |
| `src/lib/supabase/admin.ts` | Admin client (bypasses RLS) |

### Profile & Settings
| File | Purpose |
|------|---------|
| `src/app/actions/profile.ts` | Profile CRUD actions |
| `src/app/settings/page.tsx` | Settings server component |
| `src/app/settings/settings-client.tsx` | Settings UI with emoji picker |
| `src/app/settings/edit-profile/` | Edit display name page |
| `src/lib/emojis.ts` | 136 emojis (faces, animals, objects) |
| `src/components/ui/avatar-emoji.tsx` | Emoji avatar component |

---

## Database Migrations

Run in order in Supabase SQL Editor:

1. `20260206_initial_schema.sql` - Base tables
2. `20260207_add_password_hash.sql` - Add password_hash column
3. `20260207_remove_auth_users_fk.sql` - Remove auth.users FK
4. `20260207_add_emoji_avatar.sql` - Replace avatar_url with emoji

---

## Configuration

| Setting | Value |
|---------|-------|
| Session Duration | 7 days (JWT) |
| Password Min Length | 8 characters |
| Username Format | Email used as username |
| Default Role | `'user'` |
| Email Verification | Not required |

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
| Feb 9 | `b80a2f6` | Settings backend + edit profile page |
| Feb 9 | `3e4bf85` | Emoji avatars replacing profile pics |
| Feb 7 | - | Auth.js v5 implementation |
