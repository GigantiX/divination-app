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

## Pending Database Migrations
Run in Supabase SQL Editor:
- [ ] `20260207_add_password_hash.sql`
- [ ] `20260207_remove_auth_users_fk.sql`
- [ ] `20260207_add_emoji_avatar.sql`

## Future Enhancements
- [ ] Dashboard header avatar
- [ ] User detail page avatar
- [ ] Change password functionality
- [ ] Help center content
