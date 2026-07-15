# Help section: bug report with screenshot upload + Telegram delivery

## Problem

There is no way for a logged-in user to report a bug from inside the app.
The only related backend surface, `POST /v1/feedback`, is a true no-op
stub (`backend/src/modules/feedback/`) shaped for star-rating a
prediction, has no DB table backing it, and has zero frontend call
sites. There is no Help/Support entry point anywhere in the frontend
(`app/settings/page.tsx`, `components/AppMenuDrawer.tsx`), and no
file-upload UI exists in the codebase to copy from.

We want: a user can describe a bug, optionally attach one screenshot,
and submit it. The report should reach a Telegram chat (the same one
the existing ops bot posts to) immediately, and the screenshot should
be retained on the backend for 7 days for reference, then deleted.

## Design

### 1. Data model

New Drizzle table `bug_reports` (`backend/src/db/schema.ts`):

| column              | type                              | notes                        |
|---------------------|------------------------------------|-------------------------------|
| `id`                | uuid, pk, default random           |                                |
| `userId`             | uuid, fk → `users.id`, not null    |                                |
| `category`           | enum `bug` \| `feedback` \| `other`, not null | matches the dropdown |
| `description`        | text, not null, max 2000 chars     | same limit as the old feedback schema |
| `screenshotFilename` | text, nullable                     | filename only; directory comes from config |
| `createdAt`          | timestamp, default `now()`         | used by the 7-day cleanup job |

### 2. Backend module — `backend/src/modules/bug-reports/`

Follows the existing 4-file module shape (see `device-tokens` for the
reference pattern):

- `bug-reports.schemas.ts` — Zod schema for the multipart fields:
  `category` (enum), `description` (string, 1–2000 chars), `screenshot`
  (optional file: `image/jpeg` \| `image/png` \| `image/webp`, ≤ 5MB).
- `bug-reports.routes.ts` — `POST /v1/bug-reports`, router-wide
  `requireUser`. Parses `c.req.formData()`, validates the file
  server-side (type + size) even though the client also checks, then
  delegates to the service.
- `bug-reports.service.ts` — orchestrates: write the screenshot to
  disk (if present), insert the `bug_reports` row, then fire the
  Telegram notification. **A Telegram failure is caught and logged,
  never surfaced to the caller or allowed to fail the request** — the
  report is already durably persisted (DB row + file) before Telegram
  is attempted.
- `bug-reports.repo.ts` — Drizzle insert/select, plus
  `deleteOlderThan(cutoffDate)` (returns the deleted rows so the
  service can also remove their files), used by the cleanup cron.

Response: `{ id, receivedAt }`, mirroring the existing feedback stub's
response shape.

### 3. Screenshot storage

New env var `BUG_REPORT_UPLOAD_DIR`:
- Local dev default: `./uploads/bug-reports` (relative to the backend
  working dir).
- Production (EC2): set to a path **outside** the deployed code
  directory, e.g. `/home/ec2-user/aroha-backend-uploads/bug-reports/`,
  so the tar-based deploy (`backend/scripts/deploy.sh`, which extracts
  over `/home/ec2-user/aroha-backend`) never touches it. This must be
  set manually in the EC2 `.env` (hand-managed, not deployed) — the
  code creates the directory on first write if it doesn't exist.

Files are saved as `${uuid}.${ext}`, matching the row's
`screenshotFilename`. No public serving path is created — the file is
only read back by (a) the Telegram send step and (b) the cleanup job.

### 4. Telegram delivery

Add one function to `backend/src/lib/notifications/telegram.ts`,
alongside the existing `sendMessage`/`sendAlert`/`sendHealthReport`
(all raw `fetch`, no SDK):

```ts
export async function sendPhoto(
  filePath: string,
  caption: string,
  chatId?: string | number
): Promise<boolean>
```

Uses Telegram's `sendPhoto` endpoint via `multipart/form-data`
(`FormData` + the file's bytes), same auth/config
(`TELEGRAM_BOT_TOKEN`, defaulting `chatId` to
`TELEGRAM_ALERT_CHAT_ID`) as the existing functions. This lands in the
same chat the admin bot (`backend/src/modules/telegram-bot/`) already
operates in.

Service behavior:
- Screenshot present → `sendPhoto(path, caption)` where the caption
  includes category, description, and user id (through
  `escapeMarkdown` where applicable).
- No screenshot → falls back to the existing `sendAlert('Bug Report',
  formattedText)`.

### 5. 7-day cleanup cron

New route `POST /internal/cron/cleanup-bug-reports`, mounted on the
existing `cronRouter` (`backend/src/modules/cron/cron.routes.ts`),
behind the existing `requireCronSecret` middleware — same shape as
`/internal/cron/health-report` etc. Deletes DB rows (via
`deleteOlderThan(now - 7 days)`) and their corresponding files under
`BUG_REPORT_UPLOAD_DIR`.

Ships with `backend/scripts/cron-cleanup-bug-reports.sh`, following
the existing wrapper pattern (`curl` with `X-Cron-Secret` header) as
seen in `cron-health-report.sh`. **Manual step required**: this script
needs to be added as a new line in the EC2 box's crontab (daily) —
crontab itself isn't checked into the repo, matching how the existing
cron scripts are registered.

### 6. Frontend

- New row in `app/settings/page.tsx` — "Help" / "Report a bug" —
  alongside the existing Preferences/Legal/Account sections, linking
  to a new `app/settings/help/page.tsx`.
- Form on that page: category `<select>` (Bug / Feedback / Other),
  description `<textarea>` (required), optional single image picker
  (`<input type="file" accept="image/*">`) with a thumbnail preview
  and client-side type/size validation (mirrors the 5MB/jpeg-png-webp
  server-side check, so bad files are rejected before upload starts).
- New `submitBugReport()` in `lib/api.ts`, posting `FormData` (not
  JSON — there's a binary file) to `/v1/bug-reports` with the existing
  auth header helper.
- Success/error toast on submit (reusing whatever toast pattern
  already exists in the app). No "my past reports" history view — out
  of scope for this feature.
- All new user-facing copy goes through `t()` keys, added to all 7
  language files, per existing i18n convention.

## Non-goals

- No Supabase Storage — the `getSupabase()` client in
  `backend/src/config/supabase.ts` is unconfigured (placeholder env
  values) and out of scope; local disk on EC2 is sufficient for a
  7-day retention window.
- No public/authenticated URL to view a submitted screenshot — it's
  only consumed by the Telegram send and the cleanup job.
- No admin UI for browsing bug reports — Telegram is the review
  surface.
- No rate limiting on submissions — the endpoint requires auth
  already, keeping abuse risk low; can be added later if needed.
- No "my past reports" list for the user.

## Error handling

- Empty/missing `description` → 400, also blocked client-side.
- Oversized or wrong-type image → 400, also blocked client-side.
- Telegram send failure (network error, bad token, etc.) → logged
  server-side only; the API response still succeeds since the report
  is already persisted.

## Testing

- Unit tests on `bug-reports.service.ts`: file validation, DB insert,
  and the Telegram call (mocked) for both the with-screenshot and
  text-only paths.
- Unit test for `deleteOlderThan` cutoff logic in the repo.
- Manual verification in the running app: submit a report with and
  without a screenshot, confirm both arrive correctly in the Telegram
  chat (text-only vs. photo+caption), confirm the file exists under
  `BUG_REPORT_UPLOAD_DIR`, and confirm the cron endpoint deletes rows/
  files past the 7-day cutoff (test via a short cutoff override rather
  than waiting a week).
- `npx tsc --noEmit` clean in both repos; `next build` clean in the
  frontend.
