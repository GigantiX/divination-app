# Connected Apps implementation plan

Date: **22 October 2026**, Asia/Jakarta. **Implemented after user approval.** Application code and tests are present; the new Supabase table and privilege migrations have been applied. Local secrets are configured. Production deployment and a success test using a real valid OrderOnline key remain separate rollout steps. See [setup and operation](../integrations/orderonline/setup.md).

## Scope and confirmed decisions

The current request adds API connections under Settings. Both **admin and developer** can view and manage the same shared connection list. A connection stores its label, verified provider profile, and encrypted API key together as one logical database object. Multiple keys and multiple accounts are supported.

The user confirmed shared visibility and these first-release actions: **view profile, recheck, rename, replace key, disconnect**. Only OrderOnline is enabled; Berdu, Scalev, and Sejoli are visible but disabled. Product/order import, synchronization, attendance changes, webhook receivers, and other provider integrations are later work.

This plan supersedes the developer-only API access and automatic synchronization scope in Task 3 of the [older attendance plan](./participant-attendance-implementation-plan.md). The latest request explicitly grants admins access and prioritizes connecting apps. Unrelated attendance decisions remain in that document.

## What the repository already provides

| Existing location | Relevance |
| --- | --- |
| `src/app/settings/page.tsx` | Authenticated Settings entry point; loads the current database profile |
| `src/app/settings/settings-client.tsx` | Settings UI and existing admin/developer role display checks |
| `src/lib/authorization.ts` | `getUserRole` and `isAdminOrDeveloper`; use fresh database roles for sensitive operations |
| `src/app/actions/people.ts` | Existing session + database-role authorization pattern |
| `src/auth.ts` | Auth.js credentials sessions; role can be cached in the session JWT |
| `src/lib/supabase/admin.ts` | Server-side privileged client; bypasses RLS |
| `wrangler.jsonc` | Cloudflare/OpenNext runtime with Node compatibility |
| `supabase/migrations/20260918_add_orderonline_connections.sql` | Legacy browser-login status table; one row per user, explicitly excludes credentials |

The legacy table cannot model this feature: it is provider-specific, has a unique user ID, and was designed for private-VPS browser login state. Add a separate provider-neutral table. Do not alter or migrate legacy data without inspecting actual usage. Repository files were inspected; deployed schema contents have not been queried.

The existing OrderOnline CSV import and `lead_orders` are separate. The latter currently has uniqueness on source + order number, without account identity. Before future multi-account ingestion, address that identity constraint; no order schema change is required just to connect keys.

## User flow

### Settings and list

1. Admin/developer opens `/settings` and sees **Connected Apps**.
2. Clicking opens `/settings/connected-apps`.
3. Show saved connections, with provider, user-defined name, account/store identity, masked key hint, status, last verification time, and available actions.
4. The empty state explains that no API keys are connected and offers **Add New API Key**.
5. Ordinary users see no menu entry and are denied direct page/action access. Signed-out visitors follow the existing login flow.

Group or label each connection by provider; do not collapse several OrderOnline keys into one row. The shared list records who created/updated each connection for traceability. It is not filtered to its creator.

### Add New API Key

1. Open an add form, preferably a dialog consistent with the mobile Settings layout.
2. Show provider cards: OrderOnline enabled; Berdu, Scalev, Sejoli disabled with **Coming soon**. The server also rejects disabled providers.
3. Selecting OrderOnline reveals **Name** and **API Key**. Name is a local connection label, not the upstream account name.
4. API Key is masked during entry, with an optional visibility toggle. Normalize outer whitespace and validate bounded non-empty inputs. Do not assume an undocumented token prefix/format.
5. **Check Connection** stays disabled until both fields are valid, and during an in-flight check.
6. The server exchanges the key at `POST /v1/auth`, then calls `GET /v1/profile` with the returned JWT.
7. On success, show a profile preview: name, email, username/store identity when available, upstream role, active state, package/expiry when available. Null/missing optional fields get safe fallbacks.
8. Only a successful check for the current provider/key enables **Save**. Changing provider/key clears the preview and validation; editing only the local name does not require a new remote check.
9. Clicking Save performs the server validation described below, encrypts the key, and atomically stores it with the verified profile. Return to/update the list with a success message.
10. Closing/canceling before Save does not create a connection or persist the key. Clear input memory when the form closes or a save succeeds.

The browser sends a key to Divination's server over HTTPS and keeps an unsaved draft only in component memory. It never calls OrderOnline directly and never stores drafts in localStorage, URL parameters, analytics, or browser persistence.

### Existing connection actions

| Action | Behavior |
| --- | --- |
| View profile | Show the saved profile and verification timestamp; never reveal the saved key |
| Recheck | Server decrypts the saved key, authenticates again, fetches profile, and updates metadata; no key re-entry needed |
| Rename | Update only the local label, with the normal input validation |
| Replace key | Enter/check the new key and preview the profile; update the existing connection only after explicit Save |
| Disconnect | Explain the effect, then remove usable credential material and mark the connection disconnected; retain minimal identity/history metadata |

Replacement must keep the same authenticated user and owner identity. If a replacement key belongs to another user/store, show that mismatch and direct the user to add it as a new connection. Failed checks/saves leave the previous usable key intact. Rechecks cannot silently reassign a connection to another identity.

Disconnect affects Divination's stored connection; it does not revoke the key in OrderOnline. Explain that OrderOnline key revocation is performed in its own API-key settings. If reconnecting later, run the same check/save flow. Retaining disconnected metadata supports future history links, not ongoing API access.

### Feedback and failure states

- Missing inputs: inline validation; Check disabled.
- Checking/saving: visible progress and disabled duplicate submission.
- Authentication HTTP 400: explain that the key is invalid or the OrderOnline account is inactive; Save disabled.
- Profile 401/404, explicit inactive state, or malformed identity: verification cannot complete; Save disabled and a safe actionable message shown.
- Network timeout, 429, or upstream outage: explain that verification is temporarily unavailable; allow retry. Do not claim that the user's key is wrong.
- Duplicate exact key: show that it is already saved; do not add another row.
- Same provider account with a different key: warn that the account already has a connection, but allow another key. Future data ingestion must deduplicate by source-account identity.
- Database save failure: retain the verified draft in memory for retry and do not display a false success.
- Failed recheck: keep the last verified profile/time visible, mark it stale when appropriate, and record the latest outcome separately. A timeout does not prove credential invalidity.

Use the app's Indonesian message conventions while preserving the requested product labels where appropriate. Names and upstream messages render as text, never untrusted HTML.

## Backend and credential handling

### Authentication and authorization

Every page loader and server operation must validate the Auth.js session and look up the caller's **current** `profiles.role` via the existing authorization helpers. Allow only admin/developer. This includes list, detail, check, save, recheck, rename, replace, and disconnect. Do not rely only on hidden UI or a potentially stale JWT role.

The privileged Supabase client bypasses RLS, so authorization must run before any connection query, upstream request, or decryption. The application uses Auth.js rather than Supabase Auth; do not assume `auth.uid()` contains the caller's application profile ID.

### Check and Save contract

Use a small server-only provider adapter for authentication/profile normalization. Keep provider selection separate from credential storage so future integrations can supply their own verification method.

Check returns only a safe normalized profile plus a short-lived signed verification receipt bound to the caller, provider, candidate-key HMAC, verified identity, and operation target/version. It returns no upstream JWT or raw secret. The receipt contains no key and is never put in a URL. A proposed validity window is 10 minutes.

Save verifies that receipt and the caller's role, then repeats authentication/profile fetching using the submitted key before persistence. This prevents a forged client profile, a different key being substituted after Check, and saving an identity different from the preview. If identity changes or the check has expired, require a new Check. Derive all persisted profile/identity fields from server responses, not client JSON. Do not hold a database transaction open during network calls.

Enforce duplicate detection with a database constraint, not a UI-only lookup. Use an object version/conditional update for replace, recheck, and disconnect so stale requests cannot overwrite a newly replaced key or reactivate a disconnected connection. Disable repeated UI clicks and handle repeated server requests safely.

### Encryption and safe responses

Use authenticated, reversible encryption for the personal access token, proposed **AES-256-GCM** with a fresh random nonce, versioned key material, and connection/provider identity authenticated as context. A password hash alone cannot be used because future requests need the original token.

Keep the encryption master key in server runtime secrets, separate from the database and from `NEXT_PUBLIC_*`. Use a separately provisioned HMAC secret for duplicate fingerprints/verification binding. Store the nonce, authentication tag, ciphertext, and key version; keep key-rotation support explicit. Do not reuse the Auth.js secret or the Supabase privileged key as encryption material.

Only the server-only integration layer may decrypt. List/detail operations select a safe projection rather than returning database rows wholesale. Never return ciphertext, key fingerprints, encryption context, saved plaintext, or JWTs to Client Components. A short key hint is sufficient for identification. Do not add a saved-key reveal/copy endpoint.

Use a fixed HTTPS API origin, no user-supplied destination, no secret-bearing query string, bounded timeouts, disabled caching for authenticated API requests, and sanitized logs/errors. Prevent credential forwarding through redirects. Validate payload shape as well as HTTP status; `error_code: 0` alone is insufficient.

No JWT persistence is needed in this release: each explicit verification exchanges the stored personal access token again. Future high-volume features can add a separate server-side token lifecycle once expiry and concurrency behavior are verified.

The deployment uses Cloudflare/OpenNext; verify the chosen cryptography API and secret availability in that runtime as well as local Node. Do not print secret values during setup or tests.

## Proposed data model

One new `connected_apps` row represents one saved connection. Its profile JSON and encrypted credential columns form the requested **single logical object**; do not store plaintext secrets inside a general-purpose profile JSON object.

| Fields | Purpose |
| --- | --- |
| `id` | Stable internal UUID |
| `provider`, `name` | Provider identifier and user label |
| `external_user_id`, `external_owner_id` | Verified credential user and source account identity |
| `profile_snapshot` | Allowlisted JSON profile cached from the provider |
| `credential_ciphertext`, `credential_nonce`, `credential_tag`, `credential_key_version` | Authenticated encrypted personal access token |
| `credential_fingerprint`, `key_hint` | Server-only duplicate detection and safe display hint |
| `status` | Connected, needs attention, or disconnected |
| `last_check_outcome`, `last_check_error_code` | Sanitized last-attempt result, including temporary failures |
| `last_checked_at`, `last_verified_at`, `disconnected_at` | Attempt, successful verification, and disconnect times |
| `created_by`, `updated_by`, `created_at`, `updated_at`, `version` | Provenance and concurrency control |

Profile snapshot: retain identity/contact/access/store/package fields needed for this UI and future account matching. Omit bank-account details and account credit from the initial stored/displayed projection; they are unnecessary for connectivity. Do not store the authentication response alongside it because that includes a JWT. Schema version the snapshot if normalization evolves.

For owner identity use the documented `parent_id` when present, otherwise `user_id`, while preserving the role and authenticated identity. Do not infer identity from display name/email or an undocumented `store.id`.

Apply an active-credential uniqueness constraint on provider + fingerprint. Multiple rows may have the same external account identity with different keys. Index account lookup and list ordering as required; do not impose a one-key-per-user constraint. Disconnected rows have no usable credential material and cannot be rechecked until reconnected.

Enable RLS and revoke browser-role access to the entire table. Explicitly grant only the backend database role the required operations. Use server actions for both safe metadata and secrets, avoiding a second public credential path. Test grants as well as policies: Supabase's [Data API grant changes](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) mean backend access must also be explicit. [RLS and grants reference](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Implementation order after plan approval

1. Confirm deployed schema and choose final field/status names; add the new migration and server secret configuration, without modifying legacy connections or CSV ingestion.
2. Add server-only credential encryption, provider adapter, safe data projection, and fresh-role authorization.
3. Add the connection lifecycle operations, receipt validation, duplicate constraints, and concurrency protection.
4. Add Settings entry, connected-apps page, provider selection, form/preview states, and management actions.
5. Run focused local verification, then the project-required type/lint/tests and an OpenNext/Cloudflare build check where configured. No new CI workflow is required.
6. Perform a controlled real-key smoke test through the UI once implementation and runtime secrets exist. Verify auth/profile only; creating orders or configuring webhooks is outside this release.

Likely implementation locations: `src/app/settings/connected-apps/`, a new server-actions module, server-only modules under `src/lib/integrations/`, and one new migration. Exact module boundaries can follow the final implementation; the API reference is [saved here](../integrations/orderonline/reference.md).

## Acceptance and verification plan

Follow the [project testing guide](../../.agents/skills/testing-guide/SKILL.md). Unit/integration tests mock Supabase and OrderOnline; do not hit the live provider from Vitest. Browser checks use the existing local E2E setup. Run only relevant targeted checks before broad project checks.

- Admin and developer can manage the same list; user and logged-out direct calls are denied. A demoted caller loses access despite an old session role.
- Empty/list/provider-picker states work on mobile and desktop, light and dark themes, and keyboard navigation.
- Multiple OrderOnline accounts save independently; exact-key duplicates and simultaneous duplicate saves are blocked.
- Check calls auth then profile; no Save before verification, no forged profile/receipt, no key substitution, and no stale verification after provider/key changes.
- Invalid/inactive credentials, malformed responses, timeouts, 401/404/429/5xx, and failed database saves have accurate distinct feedback.
- A stored key can be rechecked without exposing it; replacement failure preserves the previous key; account mismatch cannot overwrite identity.
- Rename changes the label only; disconnect removes usable credentials without deleting retained history; stale rechecks cannot reverse disconnect/replace.
- Ciphertext round trips only with the right key/context; tampering/wrong-key decryption fails. Nonces differ. Rotation metadata is available.
- Browser-role database requests are denied, including direct access to encrypted columns. Backend grants permit intended operations.
- Secrets/JWTs are absent from page props, list/detail responses, logs, URLs, caches, and browser storage; only intentional draft submission contains the entered key.
- No product/order synchronization, new provider activation, or change to existing CSV/attendance behavior occurs from adding a key.

## Decisions still open

No product-flow question remains after the user's two confirmations. Routine implementation details above are recommendations, not additional requested features. Real provider behavior still needs a smoke test because no credential was used during planning. Unknown JWT lifetime, rate limits, webhook security, and synchronization semantics are recorded in the API reference and do not block this connection-only scope.

The user approved implementation on 22 October 2026. See the setup guide for current rollout status and verification limits.
