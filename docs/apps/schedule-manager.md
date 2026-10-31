# Schedule Manager

Implemented 31 October 2026. Open **Apps → Schedule Manager** (`/apps/schedule-manager`).

## Workflow

1. Choose **Create Schedule**, select an existing Divination event, and enter an internal schedule name.
2. Add cities using the existing Indonesian city/regency autocomplete. Each city supports up to 30 sessions; each schedule supports up to 40 cities.
3. Enter each session's date, start/end time, Indonesian timezone, venue, address, registration status, and its own OrderOnline checkout URL.
4. Configure the template, public headings, default/per-session CTA, countdown, arrows or uploaded animation, and seat displays.
5. Inspect desktop/mobile preview and the **Periksa link & UTM** simulator.
6. **Simpan draft** saves work privately. **Publish** atomically replaces the public version.
7. **Embed** copies a stable div + script snippet for an Elementor HTML widget. Choose all published cities or a single published city. Multiple embeds can appear on the same LP.

The start page groups schedules by existing event and displays active, published, draft, and archived counts. Within an event, search by schedule/city and filter status. Schedules, cities, and sessions can be duplicated. A schedule copy has its own identity and embed; updates to the original and copy are independent. Dates, links, and settings are copied and should be adjusted for the next campaign.

Admin/developer roles manage all event schedules. PICs manage schedules belonging to their assigned events. Advertisers can view schedules of their assigned events. Server actions re-read current roles and assignments; changing a browser-supplied event ID cannot move an existing schedule.

## Publication and embedding

- The database stores separate draft and published documents. Saving edits on a published schedule keeps its existing public snapshot intact.
- Each mutation uses an expected version to detect concurrent edits. A conflict prompts the editor to reload rather than overwrite someone else's changes.
- Archiving or stopping publication removes the public snapshot. Restoring an archive returns it to draft.
- The standalone widget is `/embed/schedule.js`. It uses Shadow DOM to isolate its layout from Elementor/WordPress styles, with container-based responsive cards and reduced-motion support.
- The public GET endpoint is `/api/public/schedules/{id}`. It returns only a published document, ID, and publication timestamp, supports cross-origin fetches without credentials, and sends `Cache-Control: no-store`.
- Changes appear on the next LP load; an already-open LP does not poll for new publications. Date-based hiding is re-evaluated once per minute on open LPs. Without an end time, a session remains visible through the end of its local calendar day.
- Unknown or unpublished schedules show “Jadwal belum tersedia.” Network failures offer a retry button.
- Generate production snippets from the deployed app's origin. Localhost snippets are for local testing only.

## Optional features

- **CTA:** default and per-session labels, colors, font, corner radius, new-tab behavior, and pulse animation. Labels support `{city}` and `{session}`.
- **Countdown:** disabled, a fixed local deadline with WIB/WITA/WIT timezone, or a duration per visitor. Evergreen deadlines persist in that browser's local storage and do not restart on refresh. With storage blocked, the widget falls back to in-memory persistence. Expiry can show a message, hide the timer, or close registration. Session-specific timers can coexist with the global timer.
- **Animation:** built-in animated downward arrows, a direct Lottie JSON URL/upload (200 KB maximum), or GIF/PNG/WebP URL/upload (145 KB raw maximum). Uploaded assets are stored with the document, so no separate storage configuration is necessary. Lottie playback lazily loads the pinned `lottie-web@5.13.0` light player from jsDelivr; an unavailable animation does not prevent schedule registration.
- **Seats:** actual remaining seats are calculated from manually entered capacity minus booked seats; zero closes registration. Display-only/manual numbers affect the visual indicator without changing registration status. Neither mode is synchronized to OrderOnline orders. Labels support `{remaining}`.

## OrderOnline tracking

The widget forwards `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id`, `fbclid`, `gclid`, `msclkid`, and incoming `fbp`/`fbc`. When available, `fbp`/`_fbp` and `fbc`/`_fbc` cookies provide the latter parameters. Incoming tracking replaces matching destination parameters; existing product/affiliate/custom checkout parameters and URL fragments are retained. Parameters are updated at interaction time, including links created after the LP initially loaded.

Widget anchors intentionally omit `oo-link` to avoid double decoration by OO's one-shot tracker. Existing OO scripts remain relevant to other LP links/forms and CAPI configuration. End-to-end attribution on real orders depends on the destination store's tracking setup and has not been exercised by automated tests.

References: [Elementor HTML widget](https://elementor.com/help/html-widget/), [OrderOnline tracking guide](https://help.orderonline.id/pengaturan-advanced-url-tracking-utm/), [OO-linked reference script](https://snippets.cacher.io/snippet/71fac6a7fde688a3d130), [Lottie usage](https://github.com/airbnb/lottie-web/wiki/Usage).

## Database and verification

Migration: `supabase/migrations/20261031042347_add_seminar_schedules.sql`. Applied to the connected Divination project. RLS is enabled; anonymous and authenticated database roles have no table grants or policies. Only the server's service role can select/insert/update. The “RLS Enabled No Policy” informational advisory is intentional for this Auth.js/server-only table.

A transaction that inserted, published, edited a draft, and archived a temporary schedule was rolled back after verifying publication isolation. Grants were checked directly. No example schedules were retained.

Targeted tests:

```sh
npm run test:run -- src/lib/schedules src/app/actions/schedules.test.ts src/app/apps/schedule-manager/schedule-editor.test.tsx
```

These cover authorization, publication isolation, optimistic concurrency, duplication, schema/URL validation, published-only responses, UTM forwarding, countdown persistence, seats, timezone expiry, and the event → name → city/session editor workflow. Vitest uses mocked database calls. Browser QA uses isolated fixtures; no live checkout transactions are created.
