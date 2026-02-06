# Auth.js Implementation Tasks

## Installation
- [x] Install bcryptjs and types

## Core Auth Files
- [x] Create `src/auth.ts` - Auth.js configuration
- [x] Create `src/app/api/auth/[...nextauth]/route.ts` - API route
- [x] Create `src/lib/password.ts` - Password utilities
- [x] Create `src/types/next-auth.d.ts` - Type definitions
- [x] Create `src/app/actions/auth.ts` - Server actions

## Database
- [x] Create password_hash migration

## Updates
- [x] Update `src/middleware.ts` - Replace with Auth.js
- [x] Update `src/app/login/page.tsx` - Connect to auth
- [x] Update `src/app/register/page.tsx` - Connect to auth
- [x] Update `src/app/settings/page.tsx` - Connect logout

## Verification
- [x] Build verification passed ✅
- [ ] Test login flow (requires database migration)
- [ ] Test register flow (requires database migration)
- [ ] Test logout flow (requires database migration)
