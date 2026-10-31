# Connected Apps setup and operation

Implemented on 22 October 2026. Settings → **Connected Apps** is shared by admins/developers. OrderOnline supports add/check/save, profile viewing, recheck, rename, key replacement, disconnect, and reconnect. Other provider cards remain disabled. No products/orders are synchronized.

## Database

The new `public.connected_apps` table and its backend privilege restriction have been applied to the configured **Divination** Supabase project. Both migrations are under `supabase/migrations/`; their version numbers match the remote migration history. Existing browser-login state and CSV/order tables were not migrated.

For another database environment, apply the migrations before using the page. The credential table has RLS enabled and no browser-role access. The application uses Auth.js, so its server actions perform fresh database-role checks before using the privileged Supabase client. The backend table role has only SELECT, INSERT, and UPDATE; disconnect clears credential columns with an UPDATE.

`supabase/tests/connected_apps.sql` provides a rollback-only check for permissions, duplicate keys, credential-clearing constraints, and stale-version updates. It inserts only synthetic test values and leaves no connection behind.

## Runtime secrets

These server-only values are required in every runtime that accesses saved connections:

| Variable | Value |
| --- | --- |
| `CONNECTED_APPS_ENCRYPTION_KEYS` | JSON map from key version to a base64-encoded 32-byte AES key |
| `CONNECTED_APPS_ENCRYPTION_KEY_VERSION` | Active map entry, initially `v1` |
| `CONNECTED_APPS_HMAC_SECRET` | An independent base64-encoded 32-byte secret |

The values were generated in the ignored local `.env.local`, without printing or committing them. `.env.example` documents the format. Provision the same secrets in the deployment's runtime secret manager before releasing this build. Do not put them in public environment variables, `wrangler.jsonc`, source files, or logs. This implementation has not been deployed.

Back up the secret material separately and securely: database backups alone cannot decrypt saved keys. Do not generate new secrets each time the server starts. Keep all encryption versions still referenced by rows when rotating the active version. HMAC-secret rotation also requires a fingerprint migration and invalidates outstanding verification receipts; it is not an ordinary environment-only rotation.

Next.js development Server Function argument logging is disabled in `next.config.ts`, because Check/Save submit an API key as an argument. Application errors are mapped to fixed messages rather than serializing upstream/SDK exceptions. Authentication/profile requests disable caching and reject redirects. No upstream JWT is persisted or returned to the UI.

## Verification and expected behavior

- Check exchanges the personal access token through `/v1/auth` and reads `/v1/profile` using the returned JWT.
- The Check response includes an allowlisted profile and a signed receipt bound to the caller, candidate key, account, and target version. Receipts expire after ten minutes.
- Save validates the receipt, fetches the profile again, and atomically persists the encrypted key and server-derived profile. Failed replacement preserves the previous key.
- Another key for the same owner is allowed with a warning. An identical key cannot be saved twice. Future ingestion must identify source accounts independently of connection IDs.
- Recheck uses the stored key on the server. Temporary upstream failures retain the previous profile and successful-verification timestamp.
- Disconnect clears the stored credential and retains metadata. It does not revoke the key at OrderOnline. A different user/store must be added as a new connection rather than replacing an existing identity.

Automated coverage includes the provider adapter, real encryption/receipt helpers, lifecycle actions, and form behavior. The Supabase schema/constraints and browser add-key flow were checked. A deliberately invalid key was rejected by the real backend, with Save disabled and no record created. Successful provider verification is covered with mocked responses; no real valid OrderOnline key was supplied for a live success test.

See the [API reference](./reference.md), [saved contracts](./openapi.snapshot.json), and [implementation plan](../../architecture/connected-apps-implementation-plan.md) for the full design and future API capabilities.
