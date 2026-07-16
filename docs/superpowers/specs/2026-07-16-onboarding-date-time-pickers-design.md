# Onboarding date & time pickers — design

**Date:** 2026-07-16
**Status:** Approved (pending spec review)

## Problem

Onboarding steps 3 (date of birth) and 4 (time of birth) are free-text fields.
Step 3 takes `DD/MM/YYYY` and step 4 takes `HH:MM`, each auto-formatted as the
user types (`formatDobInput` / `formatTobInput`, `app/onboarding/page.tsx:52-62`)
and regex-validated on submit (`isValidDob` / `isValidTob`, lines 42-51).

Typing a birth date on a phone keypad is slow and error-prone, and a wrong value
here silently corrupts every downstream calculation — the whole chart, dasha,
and horoscope rest on it. Users who mistype get a generic `invalidDob` error and
no help. There is no way to browse to a date.

## Goal

Replace typing with real pickers: an OS calendar for the date of birth and an OS
clock dial for the time of birth. Invalid input becomes unreachable rather than
merely rejected.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Input model | Picker only, no free text | Guarantees a valid value; removes the `invalidDob`/`invalidTob` dead end |
| Implementation | Native `<input type="date">` / `<input type="time">` | Zero new deps, free a11y, built-in year jump; already the pattern in `components/panchang/PurchasePlanModal.tsx:185` |
| Commit | Keep the send button | Consistent with every other step in the chat flow; lets the user fix a mis-tap before committing |

**Accepted trade-off:** the native picker popup follows the *phone's* locale, not
the app's in-app language switcher. A user on an English phone who selects Hindi
in-app sees an English calendar. Accepted for now over hand-building a themed
picker in all 7 languages; revisit only if it proves to be a real complaint.

## Design

Scope is one file plus a two-line CSS addition. No new component, no new
dependency, no backend change.

### 1. `app/onboarding/page.tsx` — steps 3 & 4

The existing block at lines 431-463 renders one shared `<input>` for steps 2, 3
and 4. Keep that shared shell (border, focus ring, send button) and vary only the
input type:

- **step 2 (name):** unchanged — `type="text"`.
- **step 3:** `type="date"`, `min="1900-01-01"`, `max={todayISO}`. The `min`/`max`
  encode the same range `isValidDob` checks, so the picker cannot produce an
  out-of-range date.
- **step 4:** `type="time"`.

On step 3/4, an `onClick` handler calls `e.currentTarget.showPicker()` so the
picker opens on a tap anywhere in the field rather than only on the small native
indicator icon. Wrap in `try/catch` — `showPicker()` throws `NotAllowedError`
without user activation and is absent on older engines; on throw, fall back to
the default focus behaviour (the native indicator still works).

`autoFocus` should be dropped for steps 3/4 — focusing a date input pops the
keyboard-less picker affordance with no benefit and can auto-open the picker on
some engines before the user has read the bot's question.

### 2. Value conversion — keep it at the edge

`answers.dob` is consumed as `DD/MM/YYYY` at line 285
(`const [d, m, y] = answers.dob.split("/")`) and rendered in the review summary
at line 583. Native `type="date"` emits `YYYY-MM-DD`.

Convert **on submit**, storing `answers.dob` in `DD/MM/YYYY` exactly as today.
Nothing downstream of `handleTextSubmit` changes. `type="time"` already emits
`HH:MM`, which is what `answers.tob` expects — no conversion.

One small helper replaces the two deleted formatters:

- `isoToDob("1991-08-15") -> "15/08/1991"`

`textInput` holds the raw ISO string while the user is on step 3 and binds
directly to the input's `value`; the conversion happens once, in
`handleTextSubmit`. No reverse `dobToIso` helper is needed: the flow only ever
moves forward (`setStep(s + 1)`), and the sole backward path — the confirm
sheet's restart at line 560-567 — clears `answers` wholesale, so step 3 is never
re-entered with a stored value to seed.

### 3. What is removed and what stays

- **Remove** `formatDobInput` / `formatTobInput` (lines 52-62). A picker cannot
  emit unformatted text, so they become unreachable.
- **Keep** `isValidDob` / `isValidTob` as a submit guard. `min`/`max` make a bad
  value unreachable through the UI, but the guard is ~4 lines and its error
  strings already exist in all 7 locales. Cheap defence.

### 4. `app/globals.css` — theme the native controls

Add `color-scheme: dark` to `:root` and `color-scheme: light` to the `.light`
block. Without it the native picker popup and the field's own text always render
light, which looks broken against the dark theme.

### 5. i18n

No new keys. `onboarding.step3hint` / `step4hint` stop being used as field
placeholders — `placeholder` does not render on date/time inputs; the browser
shows its own `dd/mm/yyyy` hint. The bot's chat question above the field still
carries the real instruction, so no user-facing text is lost. Leave the keys in
place; they remain referenced for step 2 and cost nothing.

## Testing

- `isoToDob` converts correctly, including a single-digit day and month
  (`1991-08-05` -> `05/08/1991`) — the zero-padding is what a naive `split` +
  reverse + `join` would get right by accident and a `Number()` round-trip would
  break.
- `isValidDob` still rejects an out-of-range year, guarding the conversion.

## Verification

1. `pnpm build` passes.
2. Run onboarding to step 3: tapping the field opens a calendar; it cannot scroll
   past today or before 1900. Pick a date, confirm the field shows it and send
   commits it.
3. Step 4: tapping opens a clock dial; pick a time and send.
4. Complete onboarding and confirm the review summary (line 583) shows the DOB as
   `DD/MM/YYYY`, and that the submitted body carries the correct `dateOfBirth`
   and `timeOfBirth` — this is the regression that matters most, since the
   conversion is new.
5. Toggle light/dark and reopen the picker; the popup should follow the app theme.

## Out of scope

- A themed in-app calendar in all 7 languages (see accepted trade-off).
- `components/panchang/PurchasePlanModal.tsx`, which already uses `type="date"`
  and is unaffected.
