# Help section: bug report with screenshot + Telegram delivery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user submit a bug report (category + description + optional screenshot) from a new Help page; the report is saved to Postgres, the screenshot is written to disk on the backend, a Telegram notification (with the photo if attached) fires immediately, and a new cron endpoint deletes reports older than 7 days.

**Architecture:** New backend module `bug-reports` (routes/schemas/service/repo/storage) mirroring the existing `device-tokens` module shape, mounted on `/v1`. Screenshots live on local disk under a configurable directory, referenced by filename only in the DB. Telegram gets a new `sendPhoto` function alongside the existing `sendMessage`/`sendAlert`. Cleanup follows the existing `/internal/cron/*` + `X-Cron-Secret` pattern. Frontend adds a Help entry to Settings and a new form page using `FormData` (not JSON, since there's a binary file).

**Tech Stack:** Hono + `@hono/zod-openapi`, Drizzle ORM (Postgres), Node 20 `fetch`/`FormData`/`File` (no new deps), Next.js App Router, react-i18next, Vitest.

Spec: `docs/superpowers/specs/2026-07-15-help-bug-report-design.md`

---

## Task 1: Database schema — `bug_reports` table

**Files:**
- Modify: `backend/src/db/schema.ts`

- [ ] **Step 1: Add the category enum**

In `backend/src/db/schema.ts`, right after the existing `platformEnum` declaration (search for `export const platformEnum = pgEnum('platform'`), add:

```ts
export const bugReportCategoryEnum = pgEnum('bug_report_category', ['bug', 'feedback', 'other']);
```

- [ ] **Step 2: Add the table + row types**

At the very end of `backend/src/db/schema.ts`, append:

```ts
/* -------------------------------------------------------------------------- */
/* bug_reports — user-submitted bug/feedback reports with an optional screenshot */
/* -------------------------------------------------------------------------- */

export const bugReports = pgTable(
  'bug_reports',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: bugReportCategoryEnum('category').notNull(),
    description: text('description').notNull(),
    /** Filename only (e.g. `<uuid>.png`); directory comes from env.BUG_REPORT_UPLOAD_DIR. */
    screenshotFilename: text('screenshot_filename'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdIdx: index('bug_reports_user_id_idx').on(table.userId),
    createdAtIdx: index('bug_reports_created_at_idx').on(table.createdAt),
  }),
);

export type BugReportRow = typeof bugReports.$inferSelect;
export type NewBugReportRow = typeof bugReports.$inferInsert;
```

- [ ] **Step 3: Generate the migration**

Run (from `backend/`):

```bash
npm run db:generate
```

Expected: a new file `src/db/migrations/00XX_<generated-name>.sql` is created containing a `CREATE TYPE "bug_report_category" ...` and `CREATE TABLE "bug_reports" ...` statement, plus a matching `src/db/migrations/meta/00XX_snapshot.json` and an updated `meta/_journal.json`. If drizzle-kit prompts about a table rename, answer that this is a new table (`+ bug_reports create table`), not a rename.

Open the generated `.sql` file and confirm it has exactly one `CREATE TYPE` and one `CREATE TABLE` statement with the columns from Step 2.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/schema.ts backend/src/db/migrations
git commit -m "feat(backend): add bug_reports table"
```

---

## Task 2: Upload directory config

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Add the env var**

In `backend/src/config/env.ts`, in the `// --- Operations ---` block, add a new line after `TELEGRAM_WEBHOOK_SECRET`:

```ts
    TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
    BUG_REPORT_UPLOAD_DIR: z.string().min(1).default('./uploads/bug-reports'),
```

- [ ] **Step 2: Document it in `.env.example`**

In `backend/.env.example`, in the `# --- Operations ---` block, add after the `TELEGRAM_WEBHOOK_SECRET` line:

```
#TELEGRAM_WEBHOOK_SECRET="your_webhook_secret_here"
# Directory for uploaded bug-report screenshots. On EC2, point this OUTSIDE
# the deployed code path (e.g. /home/ec2-user/aroha-backend-uploads/bug-reports)
# so redeploys never touch it. Defaults to ./uploads/bug-reports for local dev.
#BUG_REPORT_UPLOAD_DIR=./uploads/bug-reports
```

- [ ] **Step 3: Verify**

```bash
cd backend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/env.ts backend/.env.example
git commit -m "feat(backend): add BUG_REPORT_UPLOAD_DIR config"
```

---

## Task 3: Bug report schemas

**Files:**
- Create: `backend/src/modules/bug-reports/bug-reports.schemas.ts`

- [ ] **Step 1: Write the schema file**

```ts
import { z } from '@hono/zod-openapi';

export const BugReportCategorySchema = z.enum(['bug', 'feedback', 'other']);
export type BugReportCategory = z.infer<typeof BugReportCategorySchema>;

export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_SCREENSHOT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const BugReportFieldsSchema = z.object({
  category: BugReportCategorySchema,
  description: z.string().trim().min(1, 'Description is required').max(2000),
});
export type BugReportFields = z.infer<typeof BugReportFieldsSchema>;

export const BugReportResponseSchema = z
  .object({
    id: z.string().uuid(),
    receivedAt: z.string(),
  })
  .openapi('BugReportResponse');
export type BugReportResponseDto = z.infer<typeof BugReportResponseSchema>;
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/bug-reports/bug-reports.schemas.ts
git commit -m "feat(backend): add bug-reports schemas"
```

---

## Task 4: Screenshot storage helper

**Files:**
- Create: `backend/src/modules/bug-reports/bug-reports.storage.ts`

- [ ] **Step 1: Write the storage helper**

```ts
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function uploadDir(): string {
  return path.resolve(env.BUG_REPORT_UPLOAD_DIR);
}

export function screenshotPath(filename: string): string {
  return path.join(uploadDir(), filename);
}

/** Writes an uploaded screenshot to disk and returns its stored filename. */
export async function saveScreenshot(file: File): Promise<string> {
  const ext = EXT_BY_MIME[file.type] ?? 'bin';
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDir(), { recursive: true });
  await writeFile(screenshotPath(filename), buffer);

  return filename;
}

export async function deleteScreenshot(filename: string): Promise<void> {
  try {
    await unlink(screenshotPath(filename));
  } catch (err) {
    logger.warn({ err, filename }, 'bug-reports:deleteScreenshot failed');
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/bug-reports/bug-reports.storage.ts
git commit -m "feat(backend): add bug-report screenshot storage helper"
```

---

## Task 5: Bug report repository

**Files:**
- Create: `backend/src/modules/bug-reports/bug-reports.repo.ts`

- [ ] **Step 1: Write the repo**

```ts
import { lt } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { bugReports, type BugReportRow, type NewBugReportRow } from '../../db/schema.js';

export async function insertBugReport(values: NewBugReportRow): Promise<BugReportRow> {
  const [row] = await db.insert(bugReports).values(values).returning();
  if (!row) throw new Error('Failed to insert bug report');
  return row;
}

/** Deletes and returns every report created before `cutoff`, for the cleanup cron. */
export async function deleteBugReportsOlderThan(cutoff: Date): Promise<BugReportRow[]> {
  return db.delete(bugReports).where(lt(bugReports.createdAt, cutoff)).returning();
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/bug-reports/bug-reports.repo.ts
git commit -m "feat(backend): add bug-reports repo"
```

---

## Task 6: Telegram `sendPhoto`

**Files:**
- Modify: `backend/src/lib/notifications/telegram.ts`
- Create: `backend/src/lib/notifications/telegram.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: { TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_ALERT_CHAT_ID: '12345' },
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('fake-image-bytes')),
}));

import { sendPhoto } from './telegram.js';

describe('sendPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to the Telegram sendPhoto endpoint and returns true on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendPhoto('/tmp/fake.jpg', 'a caption');

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendPhoto',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns false when Telegram responds with a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    const result = await sendPhoto('/tmp/fake.jpg', 'a caption');

    expect(result).toBe(false);
  });

  it('returns false without throwing when TELEGRAM_BOT_TOKEN is missing', async () => {
    vi.doMock('../../config/env.js', () => ({ env: {} }));
    vi.resetModules();
    const { sendPhoto: sendPhotoNoToken } = await import('./telegram.js');

    const result = await sendPhotoNoToken('/tmp/fake.jpg', 'a caption');

    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx vitest run src/lib/notifications/telegram.test.ts
```

Expected: FAIL — `sendPhoto` is not exported from `./telegram.js`.

- [ ] **Step 3: Implement `sendPhoto`**

In `backend/src/lib/notifications/telegram.ts`, add to the imports at the top:

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';
```

(This replaces the existing two-line import block — the file already has `env` and `logger` imported; just add the two `node:` imports above them.)

Then add this function anywhere alongside the other `send*` functions:

```ts
export async function sendPhoto(
  filePath: string,
  caption: string,
  chatId?: string | number,
): Promise<boolean> {
  try {
    const targetChatId = chatId || env.TELEGRAM_ALERT_CHAT_ID;
    if (!env.TELEGRAM_BOT_TOKEN || !targetChatId) return false;

    const buffer = await readFile(filePath);
    const form = new FormData();
    form.append('chat_id', String(targetChatId));
    form.append('caption', caption);
    form.append('parse_mode', 'MarkdownV2');
    form.append('photo', new Blob([buffer]), path.basename(filePath));

    const url = `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
    const resp = await fetch(url, { method: 'POST', body: form });
    if (!resp.ok) {
      logger.warn({ status: resp.status }, 'telegram:sendPhoto failed');
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err }, 'telegram:sendPhoto error');
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx vitest run src/lib/notifications/telegram.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/notifications/telegram.ts backend/src/lib/notifications/telegram.test.ts
git commit -m "feat(backend): add telegram sendPhoto"
```

---

## Task 7: Bug report service

**Files:**
- Create: `backend/src/modules/bug-reports/bug-reports.service.ts`
- Create: `backend/src/modules/bug-reports/bug-reports.service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertBugReport = vi.fn();
const deleteBugReportsOlderThan = vi.fn();
vi.mock('./bug-reports.repo.js', () => ({ insertBugReport, deleteBugReportsOlderThan }));

const saveScreenshot = vi.fn();
const deleteScreenshot = vi.fn();
const screenshotPath = vi.fn((filename: string) => `/uploads/${filename}`);
vi.mock('./bug-reports.storage.js', () => ({ saveScreenshot, deleteScreenshot, screenshotPath }));

const sendPhoto = vi.fn();
const sendAlert = vi.fn();
vi.mock('../../lib/notifications/telegram.js', () => ({
  sendPhoto,
  sendAlert,
  escapeMarkdown: (s: string) => s,
}));

import { cleanupOldBugReports, submitBugReport, validateScreenshot } from './bug-reports.service.js';

const fields = { category: 'bug' as const, description: 'It crashed' };

function fakeFile(overrides: Partial<{ type: string; size: number }> = {}): File {
  return {
    type: overrides.type ?? 'image/png',
    size: overrides.size ?? 1024,
    arrayBuffer: async () => new ArrayBuffer(8),
  } as File;
}

describe('validateScreenshot', () => {
  it('rejects disallowed mime types', () => {
    expect(() => validateScreenshot(fakeFile({ type: 'application/pdf' }))).toThrow();
  });

  it('rejects files over 5MB', () => {
    expect(() => validateScreenshot(fakeFile({ size: 6 * 1024 * 1024 }))).toThrow();
  });

  it('accepts a valid jpeg under the size limit', () => {
    expect(() => validateScreenshot(fakeFile({ type: 'image/jpeg', size: 1024 }))).not.toThrow();
  });
});

describe('submitBugReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertBugReport.mockResolvedValue({
      id: 'report-1',
      userId: 'user-1',
      category: 'bug',
      description: 'It crashed',
      screenshotFilename: null,
      createdAt: new Date('2026-07-15T00:00:00Z'),
    });
  });

  it('saves the screenshot and sends a Telegram photo when one is attached', async () => {
    saveScreenshot.mockResolvedValue('abc.png');

    await submitBugReport('user-1', fields, fakeFile());

    expect(saveScreenshot).toHaveBeenCalled();
    expect(insertBugReport).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', screenshotFilename: 'abc.png' }),
    );
    expect(sendPhoto).toHaveBeenCalled();
    expect(sendAlert).not.toHaveBeenCalled();
  });

  it('sends a text-only Telegram alert when no screenshot is attached', async () => {
    await submitBugReport('user-1', fields, null);

    expect(saveScreenshot).not.toHaveBeenCalled();
    expect(insertBugReport).toHaveBeenCalledWith(expect.objectContaining({ screenshotFilename: null }));
    expect(sendAlert).toHaveBeenCalled();
    expect(sendPhoto).not.toHaveBeenCalled();
  });

  it('still returns the saved report when the Telegram send fails', async () => {
    sendAlert.mockRejectedValue(new Error('telegram down'));

    const result = await submitBugReport('user-1', fields, null);

    expect(result.id).toBe('report-1');
  });
});

describe('cleanupOldBugReports', () => {
  it('deletes screenshot files only for rows that had one', async () => {
    deleteBugReportsOlderThan.mockResolvedValue([
      { id: '1', screenshotFilename: 'a.png' },
      { id: '2', screenshotFilename: null },
    ]);

    const result = await cleanupOldBugReports();

    expect(deleteScreenshot).toHaveBeenCalledTimes(1);
    expect(deleteScreenshot).toHaveBeenCalledWith('a.png');
    expect(result.deleted).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx vitest run src/modules/bug-reports/bug-reports.service.test.ts
```

Expected: FAIL — `./bug-reports.service.js` doesn't exist yet.

- [ ] **Step 3: Implement the service**

```ts
import { Errors } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { escapeMarkdown, sendAlert, sendPhoto } from '../../lib/notifications/telegram.js';
import type { BugReportRow } from '../../db/schema.js';
import {
  ALLOWED_SCREENSHOT_TYPES,
  MAX_SCREENSHOT_BYTES,
  type BugReportFields,
  type BugReportResponseDto,
} from './bug-reports.schemas.js';
import { deleteBugReportsOlderThan, insertBugReport } from './bug-reports.repo.js';
import { deleteScreenshot, saveScreenshot, screenshotPath } from './bug-reports.storage.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function validateScreenshot(file: File): void {
  if (!ALLOWED_SCREENSHOT_TYPES.includes(file.type as (typeof ALLOWED_SCREENSHOT_TYPES)[number])) {
    throw Errors.badRequest('Screenshot must be JPEG, PNG, or WebP');
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    throw Errors.badRequest('Screenshot must be 5MB or smaller');
  }
}

export function toBugReportDto(row: BugReportRow): BugReportResponseDto {
  return { id: row.id, receivedAt: row.createdAt.toISOString() };
}

function buildCaption(fields: BugReportFields, userId: string): string {
  return [
    `*New ${escapeMarkdown(fields.category)} report*`,
    `User: \`${userId}\``,
    escapeMarkdown(fields.description),
  ].join('\n');
}

async function notifyTelegram(
  fields: BugReportFields,
  userId: string,
  filename: string | null,
): Promise<void> {
  try {
    const caption = buildCaption(fields, userId);
    if (filename) {
      await sendPhoto(screenshotPath(filename), caption);
    } else {
      await sendAlert(`New ${fields.category} report`, `User: ${userId}\n${fields.description}`);
    }
  } catch (err) {
    logger.warn({ err }, 'bug-reports:notifyTelegram failed');
  }
}

export async function submitBugReport(
  userId: string,
  fields: BugReportFields,
  screenshot: File | null,
): Promise<BugReportResponseDto> {
  if (screenshot) validateScreenshot(screenshot);

  const filename = screenshot ? await saveScreenshot(screenshot) : null;

  const row = await insertBugReport({
    userId,
    category: fields.category,
    description: fields.description,
    screenshotFilename: filename,
  });

  await notifyTelegram(fields, userId, filename);

  return toBugReportDto(row);
}

export async function cleanupOldBugReports(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
  const deletedRows = await deleteBugReportsOlderThan(cutoff);

  await Promise.all(
    deletedRows
      .filter((row): row is BugReportRow & { screenshotFilename: string } =>
        Boolean(row.screenshotFilename),
      )
      .map((row) => deleteScreenshot(row.screenshotFilename)),
  );

  return { deleted: deletedRows.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx vitest run src/modules/bug-reports/bug-reports.service.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/bug-reports/bug-reports.service.ts backend/src/modules/bug-reports/bug-reports.service.test.ts
git commit -m "feat(backend): add bug-reports service"
```

---

## Task 8: Routes + mount in app

**Files:**
- Create: `backend/src/modules/bug-reports/bug-reports.routes.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Write the routes file**

```ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { requireUser } from '../../middleware/auth.js';
import { Errors } from '../../lib/errors.js';
import { BugReportFieldsSchema } from './bug-reports.schemas.js';
import { submitBugReport } from './bug-reports.service.js';

export const bugReportsRouter = new OpenAPIHono();

bugReportsRouter.use('*', requireUser);

/**
 * Registered as a plain Hono route (not `.openapi()`): the OpenAPI/Zod layer
 * here doesn't model multipart file uploads — every other module's request
 * bodies are JSON. `requireUser` above and Zod validation of the non-file
 * fields below both still apply.
 */
bugReportsRouter.post('/bug-reports', async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();

  const screenshot = body.screenshot instanceof File ? body.screenshot : null;

  const parsed = BugReportFieldsSchema.safeParse({
    category: body.category,
    description: body.description,
  });
  if (!parsed.success) {
    throw Errors.badRequest('Invalid bug report', parsed.error.flatten());
  }

  const dto = await submitBugReport(user.id, parsed.data, screenshot);
  return c.json(dto, 201);
});
```

- [ ] **Step 2: Mount the router**

In `backend/src/app.ts`, add the import next to the other module imports:

```ts
import { deviceTokensRouter } from './modules/device-tokens/device-tokens.routes.js';
import { bugReportsRouter } from './modules/bug-reports/bug-reports.routes.js';
```

And mount it next to `feedbackRouter`:

```ts
  app.route('/v1', feedbackRouter);
  app.route('/v1', bugReportsRouter);
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/bug-reports/bug-reports.routes.ts backend/src/app.ts
git commit -m "feat(backend): expose POST /v1/bug-reports"
```

---

## Task 9: Cleanup cron endpoint + script

**Files:**
- Modify: `backend/src/modules/cron/cron.routes.ts`
- Create: `backend/scripts/cron-cleanup-bug-reports.sh`

- [ ] **Step 1: Add the cron route**

In `backend/src/modules/cron/cron.routes.ts`, add to the imports:

```ts
import { cleanupOldBugReports } from '../bug-reports/bug-reports.service.js';
```

Add this route + handler at the end of the file (after the `broadcastDailyReadingRoute` block):

```ts
// ---------------------------------------------------------------------------
// Cleanup: delete bug reports (and their screenshots) older than 7 days
// ---------------------------------------------------------------------------

const cleanupBugReportsRoute = createRoute({
  method: 'post',
  path: '/cron/cleanup-bug-reports',
  tags: ['Cron'],
  summary: 'Delete bug reports (and their screenshots) older than 7 days',
  description:
    'Machine-to-machine endpoint, meant to run once daily. Authenticated via the X-Cron-Secret header.',
  responses: {
    200: {
      description: 'Cleanup completed',
      content: {
        'application/json': { schema: z.object({ deleted: z.number().int() }) },
      },
    },
    403: errorResponse('Invalid or missing cron secret'),
  },
});

cronRouter.openapi(cleanupBugReportsRoute, async (c) => {
  const result = await cleanupOldBugReports();
  return c.json(result, 200);
});
```

- [ ] **Step 2: Write the wrapper script**

```bash
#!/usr/bin/env bash
#
# Triggers the bug-report cleanup cron (deletes reports + screenshots older
# than 7 days).
#
# Wire into the EC2 crontab to run once daily, e.g.:
#   17 3 * * * /home/ec2-user/aroha-backend/scripts/cron-cleanup-bug-reports.sh \
#     >> /home/ec2-user/cron-cleanup-bug-reports.log 2>&1
#
# Reads CRON_SECRET from the app's .env (never hard-coded in the crontab) and
# calls the internal, secret-protected endpoint on localhost.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"
SECRET="$(grep -E '^CRON_SECRET=' "$DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"

if [ -z "$SECRET" ]; then
  echo "$(date -u +%FT%TZ) ERROR: CRON_SECRET not set in $DIR/.env" >&2
  exit 1
fi

echo "$(date -u +%FT%TZ) starting bug-report cleanup run"
curl -fsS -X POST \
  -H "X-Cron-Secret: $SECRET" \
  -H 'Content-Type: application/json' \
  -d '{}' \
  "http://127.0.0.1:${PORT}/internal/cron/cleanup-bug-reports"
echo
echo "$(date -u +%FT%TZ) done"
```

Save this to `backend/scripts/cron-cleanup-bug-reports.sh` and make it executable:

```bash
chmod +x backend/scripts/cron-cleanup-bug-reports.sh
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/cron/cron.routes.ts backend/scripts/cron-cleanup-bug-reports.sh
git commit -m "feat(backend): add 7-day bug-report cleanup cron"
```

**Note for later (not part of this plan's scope):** once deployed, someone needs to manually add the crontab line shown in the script's header comment to the EC2 box — crontab entries aren't tracked in the repo.

---

## Task 10: i18n keys (all 7 languages)

**Files:**
- Modify: `i18n/resources.ts`

- [ ] **Step 1: Add English keys**

In `i18n/resources.ts`, find the English `settings: { ... }` block (`title: "Settings", ... account: "Account", },`) and add a `support` key to it:

```ts
      settings: {
        title: "Settings",
        preferences: "Preferences",
        language: "Language",
        theme: "Appearance",
        legal: "Legal",
        support: "Support",
        account: "Account",
      },
```

Immediately after that block's closing `},` (right before `permissions: {`), insert a new `help` block:

```ts
      help: {
        title: "Report a Bug",
        category: "Category",
        categoryBug: "Bug",
        categoryFeedback: "Feedback",
        categoryOther: "Other",
        description: "Description",
        descriptionPlaceholder: "Describe what happened...",
        screenshot: "Screenshot (optional)",
        screenshotHint: "JPEG, PNG, or WebP, up to 5MB",
        removeScreenshot: "Remove",
        submit: "Submit",
        submitting: "Submitting...",
        successTitle: "Thanks for letting us know!",
        successBody: "We've received your report and will look into it.",
        errorGeneric: "Couldn't submit your report. Please try again.",
        errorDescriptionRequired: "Please describe the issue",
        errorScreenshotType: "Screenshot must be JPEG, PNG, or WebP",
        errorScreenshotSize: "Screenshot must be 5MB or smaller",
      },
```

- [ ] **Step 2: Add Hindi (`hi`) keys**

Same two edits in the `hi` block's `settings`/insertion point:

```ts
      settings: {
        title: "सेटिंग्स",
        preferences: "प्राथमिकताएं",
        language: "भाषा",
        theme: "थीम",
        legal: "कानूनी",
        support: "सहायता",
        account: "खाता",
      },
      help: {
        title: "बग की रिपोर्ट करें",
        category: "श्रेणी",
        categoryBug: "बग",
        categoryFeedback: "फीडबैक",
        categoryOther: "अन्य",
        description: "विवरण",
        descriptionPlaceholder: "क्या हुआ बताएं...",
        screenshot: "स्क्रीनशॉट (वैकल्पिक)",
        screenshotHint: "JPEG, PNG, या WebP, 5MB तक",
        removeScreenshot: "हटाएं",
        submit: "सबमिट करें",
        submitting: "सबमिट किया जा रहा है...",
        successTitle: "बताने के लिए धन्यवाद!",
        successBody: "हमें आपकी रिपोर्ट मिल गई है और हम इसे देखेंगे।",
        errorGeneric: "आपकी रिपोर्ट सबमिट नहीं हो सकी। कृपया पुनः प्रयास करें।",
        errorDescriptionRequired: "कृपया समस्या का विवरण दें",
        errorScreenshotType: "स्क्रीनशॉट JPEG, PNG, या WebP होना चाहिए",
        errorScreenshotSize: "स्क्रीनशॉट 5MB या उससे छोटा होना चाहिए",
      },
```

- [ ] **Step 3: Add Bengali (`bn`) keys**

**Do not paste a full `settings: {...}` block here** — this session only confirmed the `bn.settings.title` value by grep (`সেটিংস`) and never read the full existing `bn.settings` object, so the `preferences`/`language`/`theme`/`legal`/`account` values below are unverified reconstructions and could silently overwrite the real strings if pasted wholesale. Instead:

1. Open `i18n/resources.ts`, find the `bn` block's existing `settings: { ... }` object, and add exactly one new line to it (keep every other line untouched): `support: "সহায়তা",`
2. Immediately after that object's closing `},`, insert this entire new `help` object (safe to paste as-is — it's net-new, nothing to clobber):

```ts
      help: {
        title: "বাগ রিপোর্ট করুন",
        category: "বিভাগ",
        categoryBug: "বাগ",
        categoryFeedback: "মতামত",
        categoryOther: "অন্যান্য",
        description: "বিবরণ",
        descriptionPlaceholder: "কী হয়েছে বর্ণনা করুন...",
        screenshot: "স্ক্রিনশট (ঐচ্ছিক)",
        screenshotHint: "JPEG, PNG, বা WebP, সর্বোচ্চ 5MB",
        removeScreenshot: "সরান",
        submit: "জমা দিন",
        submitting: "জমা দেওয়া হচ্ছে...",
        successTitle: "জানানোর জন্য ধন্যবাদ!",
        successBody: "আমরা আপনার রিপোর্ট পেয়েছি এবং এটি দেখব।",
        errorGeneric: "আপনার রিপোর্ট জমা দেওয়া যায়নি। আবার চেষ্টা করুন।",
        errorDescriptionRequired: "অনুগ্রহ করে সমস্যাটি বর্ণনা করুন",
        errorScreenshotType: "স্ক্রিনশট অবশ্যই JPEG, PNG, বা WebP হতে হবে",
        errorScreenshotSize: "স্ক্রিনশট অবশ্যই 5MB বা তার কম হতে হবে",
      },
```

- [ ] **Step 4: Add Marathi (`mr`) keys**

Same two-part approach as Step 3 (add one line to the existing `mr.settings`, then insert a new `mr.help` block after it — do not reconstruct/replace the existing `settings` object). Add to `mr.settings`: `support: "मदत",`. Then insert:

```ts
      help: {
        title: "बग रिपोर्ट करा",
        category: "श्रेणी",
        categoryBug: "बग",
        categoryFeedback: "अभिप्राय",
        categoryOther: "इतर",
        description: "वर्णन",
        descriptionPlaceholder: "काय झाले ते सांगा...",
        screenshot: "स्क्रीनशॉट (ऐच्छिक)",
        screenshotHint: "JPEG, PNG, किंवा WebP, 5MB पर्यंत",
        removeScreenshot: "काढा",
        submit: "सबमिट करा",
        submitting: "सबमिट करत आहे...",
        successTitle: "कळवल्याबद्दल धन्यवाद!",
        successBody: "आम्हाला तुमचा अहवाल मिळाला असून आम्ही तो तपासू.",
        errorGeneric: "तुमचा अहवाल सबमिट करता आला नाही. कृपया पुन्हा प्रयत्न करा.",
        errorDescriptionRequired: "कृपया समस्येचे वर्णन करा",
        errorScreenshotType: "स्क्रीनशॉट JPEG, PNG, किंवा WebP असणे आवश्यक आहे",
        errorScreenshotSize: "स्क्रीनशॉट 5MB किंवा त्यापेक्षा कमी असणे आवश्यक आहे",
      },
```

- [ ] **Step 5: Add Telugu (`te`) keys**

Same approach. Add to `te.settings`: `support: "మద్దతు",`. Then insert:

```ts
      help: {
        title: "బగ్‌ను నివేదించండి",
        category: "వర్గం",
        categoryBug: "బగ్",
        categoryFeedback: "అభిప్రాయం",
        categoryOther: "ఇతర",
        description: "వివరణ",
        descriptionPlaceholder: "ఏమి జరిగిందో వివరించండి...",
        screenshot: "స్క్రీన్‌షాట్ (ఐచ్ఛికం)",
        screenshotHint: "JPEG, PNG, లేదా WebP, 5MB వరకు",
        removeScreenshot: "తీసివేయండి",
        submit: "సమర్పించండి",
        submitting: "సమర్పిస్తోంది...",
        successTitle: "తెలియజేసినందుకు ధన్యవాదాలు!",
        successBody: "మేము మీ నివేదికను స్వీకరించాము మరియు దానిని పరిశీలిస్తాము.",
        errorGeneric: "మీ నివేదికను సమర్పించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.",
        errorDescriptionRequired: "దయచేసి సమస్యను వివరించండి",
        errorScreenshotType: "స్క్రీన్‌షాట్ తప్పనిసరిగా JPEG, PNG, లేదా WebP అయి ఉండాలి",
        errorScreenshotSize: "స్క్రీన్‌షాట్ తప్పనిసరిగా 5MB లేదా అంతకంటే తక్కువ ఉండాలి",
      },
```

- [ ] **Step 6: Add Tamil (`ta`) keys**

Same approach. Add to `ta.settings`: `support: "ஆதரவு",`. Then insert:

```ts
      help: {
        title: "பிழையைப் புகாரளிக்கவும்",
        category: "வகை",
        categoryBug: "பிழை",
        categoryFeedback: "கருத்து",
        categoryOther: "மற்றவை",
        description: "விவரம்",
        descriptionPlaceholder: "என்ன நடந்தது என்பதை விவரிக்கவும்...",
        screenshot: "ஸ்கிரீன்ஷாட் (விருப்பத்தேர்வு)",
        screenshotHint: "JPEG, PNG, அல்லது WebP, 5MB வரை",
        removeScreenshot: "அகற்று",
        submit: "சமர்ப்பிக்கவும்",
        submitting: "சமர்ப்பிக்கிறது...",
        successTitle: "தெரிவித்ததற்கு நன்றி!",
        successBody: "உங்கள் அறிக்கை எங்களுக்குக் கிடைத்துள்ளது, நாங்கள் அதை பரிசீலிப்போம்.",
        errorGeneric: "உங்கள் அறிக்கையை சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        errorDescriptionRequired: "சிக்கலை விவரிக்கவும்",
        errorScreenshotType: "ஸ்கிரீன்ஷாட் JPEG, PNG, அல்லது WebP ஆக இருக்க வேண்டும்",
        errorScreenshotSize: "ஸ்கிரீன்ஷாட் 5MB அல்லது அதற்கும் குறைவாக இருக்க வேண்டும்",
      },
```

- [ ] **Step 7: Add Gujarati (`gu`) keys**

Same approach. Add to `gu.settings`: `support: "સહાય",`. Then insert:

```ts
      help: {
        title: "બગની જાણ કરો",
        category: "શ્રેણી",
        categoryBug: "બગ",
        categoryFeedback: "પ્રતિસાદ",
        categoryOther: "અન્ય",
        description: "વર્ણન",
        descriptionPlaceholder: "શું થયું તે વર્ણવો...",
        screenshot: "સ્ક્રીનશોટ (વૈકલ્પિક)",
        screenshotHint: "JPEG, PNG, અથવા WebP, 5MB સુધી",
        removeScreenshot: "દૂર કરો",
        submit: "સબમિટ કરો",
        submitting: "સબમિટ થઈ રહ્યું છે...",
        successTitle: "જણાવવા બદલ આભાર!",
        successBody: "અમને તમારો રિપોર્ટ મળી ગયો છે અને અમે તેની તપાસ કરીશું.",
        errorGeneric: "તમારો રિપોર્ટ સબમિટ કરી શકાયો નથી. કૃપા કરી ફરી પ્રયાસ કરો.",
        errorDescriptionRequired: "કૃપા કરી સમસ્યાનું વર્ણન કરો",
        errorScreenshotType: "સ્ક્રીનશોટ JPEG, PNG, અથવા WebP હોવો જોઈએ",
        errorScreenshotSize: "સ્ક્રીનશોટ 5MB અથવા તેનાથી ઓછો હોવો જોઈએ",
      },
```

**Important — applies to Steps 2–7 as a whole:** for every language, only (a) add the single `support:` line to the existing `settings` object and (b) insert the new `help` object after it. Never replace/retype an existing `settings` object wholesale — Steps 2 (Hindi) and this note's re-confirmation for bn/mr/te/ta/gu exist because only `en` and `hi`'s full `settings` blocks were actually read this session; the `title`/`support` translations above are provided in good faith but the surrounding existing keys must come from the file itself, not from this plan.

- [ ] **Step 8: Verify JSON/TS structure is valid**

```bash
npx tsc --noEmit -p . 2>&1 | grep -i resources.ts || echo "no errors in resources.ts"
```

Expected: `no errors in resources.ts` (or the project's normal typecheck command passes with no new errors attributable to this file).

- [ ] **Step 9: Commit**

```bash
git add i18n/resources.ts
git commit -m "feat(i18n): add help/bug-report translations for all 7 languages"
```

---

## Task 11: Frontend API client

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Add types + the `api.submitBugReport` entry**

In `lib/api.ts`, add near the other endpoint entries in the `export const api = { ... }` object (e.g. right after the `revokeDeviceToken` entry):

```ts
  /** Submit a bug/feedback report, optionally with a screenshot. */
  submitBugReport: (input: BugReportInput) => postBugReport(input),
```

- [ ] **Step 2: Add the types + standalone function**

At the end of `lib/api.ts`, add:

```ts
// ─── Bug Reports ────────────────────────────────────────────────────────────

export interface BugReportInput {
  category: "bug" | "feedback" | "other";
  description: string;
  screenshot?: File | null;
}

export interface BugReportResponse {
  id: string;
  receivedAt: string;
}

async function postBugReport(input: BugReportInput): Promise<BugReportResponse> {
  const formData = new FormData();
  formData.append("category", input.category);
  formData.append("description", input.description);
  if (input.screenshot) formData.append("screenshot", input.screenshot);

  const headers = await authHeader();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/bug-reports`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server");
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)
      ?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "http_error",
      err?.message ?? `Request failed (${res.status})`,
      err?.requestId,
    );
  }

  return data as BugReportResponse;
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api.ts
git commit -m "feat(frontend): add submitBugReport API client"
```

---

## Task 12: Settings page — Support section

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Add the icon import**

Change:

```tsx
import { ArrowLeft, Globe, Moon, ScrollText, ShieldCheck, LogOut, ChevronRight } from "lucide-react";
```

to:

```tsx
import { ArrowLeft, Globe, Moon, ScrollText, ShieldCheck, LogOut, ChevronRight, HelpCircle } from "lucide-react";
```

- [ ] **Step 2: Add the Support section**

Insert between the Legal section and the Account section:

```tsx
        {/* Legal */}
        <SectionLabel>{t("settings.legal")}</SectionLabel>
        <div className="space-y-2.5 mb-6">
          <SettingsLink href="/legal/terms" icon={<ScrollText size={16} />} label={t("legal.terms")} />
          <SettingsLink href="/legal/privacy" icon={<ShieldCheck size={16} />} label={t("legal.privacy")} />
        </div>

        {/* Support */}
        <SectionLabel>{t("settings.support")}</SectionLabel>
        <div className="space-y-2.5 mb-6">
          <SettingsLink href="/settings/help" icon={<HelpCircle size={16} />} label={t("help.title")} />
        </div>

        {/* Account */}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat(frontend): add Support/Help entry to Settings"
```

---

## Task 13: Help page (the form)

**Files:**
- Create: `app/settings/help/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Paperclip, X } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import OutlineButton from "@/components/ui/OutlineButton";
import { api, ApiError } from "@/lib/api";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Category = "bug" | "feedback" | "other";
type Status = "idle" | "submitting" | "success" | "error";

export default function HelpPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<Category>("bug");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!ALLOWED_SCREENSHOT_TYPES.includes(file.type)) {
      setErrorMessage(t("help.errorScreenshotType"));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setErrorMessage(t("help.errorScreenshotSize"));
      e.target.value = "";
      return;
    }

    setErrorMessage(null);
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setErrorMessage(t("help.errorDescriptionRequired"));
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    try {
      await api.submitBugReport({ category, description: description.trim(), screenshot });
      setStatus("success");
      setDescription("");
      removeScreenshot();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof ApiError ? err.message : t("help.errorGeneric"));
    }
  };

  return (
    <main className="min-h-screen pb-28 bg-background">
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground">{t("help.title")}</h1>
        </div>

        {status === "success" ? (
          <Card className="p-5 text-center">
            <p className="text-sm font-medium text-foreground mb-1">{t("help.successTitle")}</p>
            <p className="text-sm text-muted">{t("help.successBody")}</p>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-muted uppercase tracking-wider mb-2 ml-1">
                {t("help.category")}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground"
              >
                <option value="bug">{t("help.categoryBug")}</option>
                <option value="feedback">{t("help.categoryFeedback")}</option>
                <option value="other">{t("help.categoryOther")}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-muted uppercase tracking-wider mb-2 ml-1">
                {t("help.description")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("help.descriptionPlaceholder")}
                rows={5}
                maxLength={2000}
                className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-muted uppercase tracking-wider mb-2 ml-1">
                {t("help.screenshot")}
              </label>
              {screenshotPreview ? (
                <div className="relative w-24 h-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotPreview}
                    alt=""
                    className="w-24 h-24 object-cover rounded-xl border border-gold/20"
                  />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    aria-label={t("help.removeScreenshot")}
                    className="absolute -top-2 -right-2 bg-card border border-gold/30 rounded-full p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-muted"
                >
                  <Paperclip size={14} />
                  {t("help.screenshotHint")}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

            <OutlineButton type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? t("help.submitting") : t("help.submit")}
            </OutlineButton>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/settings/help/page.tsx
git commit -m "feat(frontend): add bug report form page"
```

---

## Task 14: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Backend full check**

```bash
cd backend && npm run typecheck && npm test
```

Expected: typecheck clean, all vitest suites pass (including the new `telegram.test.ts` and `bug-reports.service.test.ts`).

- [ ] **Step 2: Frontend build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both clean.

- [ ] **Step 3: Manual local run — backend**

Start the backend locally (`npm run dev` in `backend/`, with `.env` pointing at a working `DATABASE_URL` and real `TELEGRAM_BOT_TOKEN`/`TELEGRAM_ALERT_CHAT_ID` if available). Run the migration:

```bash
cd backend && npm run db:migrate
```

Expected: the new `bug_reports` table + `bug_report_category` type exist (verify with `npm run db:studio` or a direct `psql` query if convenient).

- [ ] **Step 4: Manual local run — frontend flow**

Start the frontend (`npm run dev`), sign in, navigate to Settings → Support → the new Help entry, and submit two reports:
1. With a screenshot attached (a small JPEG/PNG) — confirm the success screen appears, and confirm the file lands in `backend/uploads/bug-reports/` (or wherever `BUG_REPORT_UPLOAD_DIR` points locally).
2. Without a screenshot — confirm the success screen appears.

If `TELEGRAM_BOT_TOKEN`/`TELEGRAM_ALERT_CHAT_ID` are configured locally, confirm both reports arrive in the Telegram chat (one as a photo+caption, one as a text-only alert).

- [ ] **Step 5: Manual cleanup-cron check**

With `CRON_SECRET` set locally, call the new endpoint directly:

```bash
curl -X POST -H "X-Cron-Secret: <your local CRON_SECRET>" -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:3000/internal/cron/cleanup-bug-reports
```

Expected: `{"deleted":0}` (nothing is older than 7 days yet) with a 200 status — confirms the route is wired correctly. Full deletion behavior is already covered by the `cleanupOldBugReports` unit test in Task 7.

- [ ] **Step 6: Report status**

Summarize what was verified (or any failures found) back to the user. Do not deploy to EC2 or push to any remote branch as part of this task — that's a separate, explicitly-confirmed action.
