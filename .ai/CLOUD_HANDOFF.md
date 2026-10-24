# Cloud Handoff — Palmistry V2 · Step 0B · Task 1 of many

## Context
Branch: `feat/palmistry-v2` (both `../backend` and `../frontend`).
The Palmistry V2 plan (see CURRENT_TASK.md for the full objective) reduces palm capture from 6 photo
slots to 3. This is the *backend storage-paths* sub-task only.

## Exact task
Edit **two files** in the BACKEND repo (`C:\Users\wookiee\aroha-astrology\backend`):

### File 1: `src/lib/palm/storage-paths.ts`

Replace the current file with this exact content (double-check the code compiles — it is TypeScript):

```ts
// =============================================================================
// Pure path/hash helpers for palm-reading storage — no I/O, unit-tested in
// isolation. The actual GCS calls (storage.ts) are a thin, untested wrapper
// around these, same posture this codebase already takes toward DB-touching
// repo functions (e.g. reports.repo.ts has no direct unit tests; only its
// pure logic does).
// =============================================================================

import { createHash } from 'node:crypto';

/** The 3 slots the current app captures.  PRIMARY_SLOTS === PALM_CAPTURE_SLOTS. */
export const PALM_CAPTURE_SLOTS = [
  'primaryFront',
  'primaryPercussion',
  'primaryFingertips',
] as const;

export type PalmCaptureSlot = (typeof PALM_CAPTURE_SLOTS)[number];

export const PRIMARY_SLOTS = PALM_CAPTURE_SLOTS;
export const ALL_SLOTS = PALM_CAPTURE_SLOTS;

/**
 * Old slot names that existed before the 6→3 reduction (2026-10).  The upload
 * route still accepts them so that a user who started a capture on an older app
 * version can finish without an error.  They are NOT part of PALM_CAPTURE_SLOTS
 * and are not required for analyze().
 */
export const LEGACY_SLOTS = [
  'primaryDorsal',
  'secondaryFront',
  'secondaryPercussion',
] as const;

export type LegacyPalmCaptureSlot = (typeof LEGACY_SLOTS)[number];

const SLOT_SET = new Set<string>([...PALM_CAPTURE_SLOTS, ...LEGACY_SLOTS]);

/** Private bucket path for one captured frame. Slot is validated against the
 * fixed known set — never interpolated from unchecked user input — so this
 * can't be used for path traversal even if a caller forgets to validate
 * upstream. */
export function buildFramePath(userId: string, readingId: string, slot: string): string {
  if (!SLOT_SET.has(slot)) {
    throw new Error(`Unknown palm capture slot: ${slot}`);
  }
  return `palm/${userId}/${readingId}/${slot}.jpg`;
}

/**
 * SHA-256 over the full captured frame set, order-independent (sorted by slot
 * key) so upload order never affects the hash. Used to dedupe an identical
 * re-upload — see palm_readings.frames_hash — so a repeat submission skips
 * the vision call entirely.
 */
export function computeFramesHash(frames: Partial<Record<string, Buffer>>): string {
  const hash = createHash('sha256');
  const slots = Object.keys(frames).sort();
  for (const slot of slots) {
    hash.update(slot);
    hash.update(frames[slot]!);
  }
  return hash.digest('hex');
}
```

### File 2: `test/palm-storage-paths.test.ts`

Replace the current file with this exact content:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildFramePath,
  computeFramesHash,
  PALM_CAPTURE_SLOTS,
  PRIMARY_SLOTS,
  LEGACY_SLOTS,
} from '../src/lib/palm/storage-paths';

describe('PALM_CAPTURE_SLOTS', () => {
  it('contains exactly 3 slots: primaryFront, primaryPercussion, primaryFingertips', () => {
    expect([...PALM_CAPTURE_SLOTS]).toEqual([
      'primaryFront',
      'primaryPercussion',
      'primaryFingertips',
    ]);
  });

  it('PRIMARY_SLOTS equals PALM_CAPTURE_SLOTS', () => {
    expect(PRIMARY_SLOTS).toBe(PALM_CAPTURE_SLOTS);
  });
});

describe('buildFramePath', () => {
  it('builds a deterministic, user-scoped, private-looking path', () => {
    const path = buildFramePath('user-1', 'reading-1', 'primaryFront');
    expect(path).toBe('palm/user-1/reading-1/primaryFront.jpg');
  });

  it('still accepts legacy slot primaryDorsal (backward compat)', () => {
    const path = buildFramePath('user-1', 'reading-1', 'primaryDorsal');
    expect(path).toBe('palm/user-1/reading-1/primaryDorsal.jpg');
  });

  it('still accepts legacy slot secondaryFront', () => {
    const path = buildFramePath('user-1', 'reading-1', 'secondaryFront');
    expect(path).toBe('palm/user-1/reading-1/secondaryFront.jpg');
  });

  it('still accepts legacy slot secondaryPercussion', () => {
    const path = buildFramePath('user-1', 'reading-1', 'secondaryPercussion');
    expect(path).toBe('palm/user-1/reading-1/secondaryPercussion.jpg');
  });

  it('rejects a slot name that is not one of the known capture slots', () => {
    expect(() => buildFramePath('user-1', 'reading-1', '../etc/passwd')).toThrow();
  });
});

describe('computeFramesHash', () => {
  it('is order-independent across the slot map (same frames, different insertion order)', () => {
    const a = computeFramesHash({
      primaryFront: Buffer.from('AAA'),
      primaryPercussion: Buffer.from('BBB'),
    });
    const b = computeFramesHash({
      primaryPercussion: Buffer.from('BBB'),
      primaryFront: Buffer.from('AAA'),
    });
    expect(a).toBe(b);
  });

  it('differs when any single frame differs', () => {
    const a = computeFramesHash({
      primaryFront: Buffer.from('AAA'),
      primaryPercussion: Buffer.from('BBB'),
    });
    const b = computeFramesHash({
      primaryFront: Buffer.from('AAA'),
      primaryPercussion: Buffer.from('CCC'),
    });
    expect(a).not.toBe(b);
  });

  it('differs when the SET of captured slots differs, even if bytes overlap', () => {
    const a = computeFramesHash({ primaryFront: Buffer.from('AAA') });
    const b = computeFramesHash({
      primaryFront: Buffer.from('AAA'),
      primaryPercussion: Buffer.from(''),
    });
    expect(a).not.toBe(b);
  });

  it('produces a hex sha256 digest', () => {
    const hash = computeFramesHash({ primaryFront: Buffer.from('AAA') });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('LEGACY_SLOTS', () => {
  it('contains exactly the 3 dropped slot names', () => {
    expect([...LEGACY_SLOTS]).toEqual([
      'primaryDorsal',
      'secondaryFront',
      'secondaryPercussion',
    ]);
  });
});
```

## Constraints
- Write ONLY those two files. Do not touch any other file.
- Use 2-space indentation, double quotes for strings in TypeScript.
- Do not install packages or run any commands.
- The `computeFramesHash` signature changed from `Partial<Record<PalmCaptureSlot, Buffer>>` to
  `Partial<Record<string, Buffer>>` so legacy slots can be hashed too. Keep the implementation
  identical otherwise.

## Expected result
After the edit, running `pnpm --filter backend test -- palm-storage-paths` should pass all tests.
Write `LOCAL_RESULT.md` with the list of files you changed and whether the logic matches the spec above.
