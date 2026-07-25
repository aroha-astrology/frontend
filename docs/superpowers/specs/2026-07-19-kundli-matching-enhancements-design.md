# Kundli Matching enhancements — design

Date: 2026-07-19
Repo: `frontend` (this checkout). No backend changes required.

## Background

The user shared three reference screenshots (confirmed to be from a different app, used purely as
design inspiration — not screenshots of our current product) showing a Kundli Matching flow with:
an "Open Kundli" saved-profile picker, a New Matching form, and a richly-detailed results screen.

Investigation found our actual `app/compatibility/page.tsx` already covers the *shape* of the
results screen reasonably well (score, per-koota list, Mangal Dosha, recommendation, "Ask an
Astrologer" CTA) — no redesign needed there. The real gaps, confirmed with the user, are narrower:

1. No way to fill Boy's/Girl's Details from an already-saved profile — only manual typing, or a
   "This is me" checkbox that (buggily) always fills the Boy's side.
2. Per-koota descriptions are terse, result-specific technical lines (e.g. *"Same nadi (Vata) -
   Nadi dosha present"*) with no general explanation of what each koota measures.
3. The "Ask an Astrologer" handoff to AI chat sends only a one-line summary (names + total score +
   red-flag doshas), and never uses the backend's existing (built, but zero callers today)
   `compareProfileId` chat-grounding feature that computes a real synastry reading against a saved
   profile.

## Current state (confirmed by reading the code)

- `app/compatibility/page.tsx` — the New Matching + results screen. `CompatForm { boy, girl }`
  local state, `PersonForm { name, dob, time, place }`. `useMyDetails` checkbox (lines ~46-75)
  hardcodes filling `boy` from `useAuth().user`, ignoring `user.gender`.
- `/v1/profiles` (`lib/api.ts` `Profile` type, `listProfiles()`) — the live, already-deployed
  multi-profile system. Each `Profile` has `gender: Gender` (`"male"|"female"|"other"|null`),
  `relationship: ProfileRelationship | null` (includes `partner`/`prospective_match`),
  `displayName`, `dateOfBirth`, `timeOfBirth`, `placeOfBirth`. Already loaded app-wide via
  `useAuth().profiles` — no new fetch needed to use it here.
- `components/ProfileSwitcher.tsx` (`ProfileSwitcherSheet`) — existing reusable pattern: a
  `BottomSheetModal` listing profiles with avatar-initial circle, name, relationship tag, select
  callback. Template for the new picker.
- Backend `POST /v1/chat` (`backend/src/modules/astro/astro.schemas.ts` `ChatRequestSchema`)
  already accepts an optional `compareProfileId` (a `birth_profiles` row id). When present,
  `chatStream` (`astro.service.ts`) calls `buildSecondChartFacts(userId, groundingSource,
  compareProfileId)`, which — for `partner`/`spouse`/`prospective_match` relationships — computes a
  **real** Ashtakoota synastry score + Mangal Dosha comparison between the caller's own chart and
  the saved profile's chart, and injects it as a grounding fact for the LLM. Confirmed via grep:
  **no frontend code passes `compareProfileId` today** — this capability is fully built and unused.
- `/v1/profiles` and the older `/v1/birth-profiles` surface are two route layers over the **same**
  `birth_profiles` DB table (confirmed via code comments in `birth-profiles.repo.ts`) — so a
  `Profile.id` from `/v1/profiles` is directly usable as `compareProfileId`.
- `lib/chat-handoff.ts` / `CHAT_PENDING_CONTEXT_KEY` — sessionStorage handoff: `compatibility/page.tsx`'s
  `askAstrologer()` writes a plain string; `ChatConversation.tsx` reads it once on mount and calls
  `sendMessage(pending)` — i.e. it's sent as a literal first chat message, not structured grounding.
- `lib/swarm-api.ts` `streamChat()` opts already forward a `chartId` field to the backend in the
  same pattern `compareProfileId` would need (precedent to follow, not currently wired to
  `ChatRequestSchema.compareProfileId`).
- Guna description strings are computed server-side per koota in
  `backend/src/lib/astro-engine/matching/ashtakoota.ts` (e.g. Nadi: `` `Same nadi (${nadi1}) - Nadi
  dosha present` ``) — these are **result-specific**, not general explainers, and are returned as
  `kutaDetails[].description` in `MatchmakingResponse`. Left as-is; the new general explainer is a
  separate, additive piece of frontend content.

## Changes

### 1. Saved-profile picker (Boy's/Girl's Details)

New component `components/compatibility/BirthProfilePickerSheet.tsx`, structurally copied from
`ProfileSwitcherSheet` (same `BottomSheetModal` + avatar-initial row pattern) but with a `select`
callback instead of `switchProfile`, and a `genderFilter: "male" | "female"` prop.

- Filtering: the Boy's-side sheet shows profiles where `gender === "male" || gender == null`; the
  Girl's-side sheet shows `gender === "female" || gender == null`. Gender-unset/"other" profiles are
  visible in both (can't be auto-classified, so don't hide them from either side).
- Trigger: a small icon button next to each side's Name input, opening that side's filtered sheet.
- On select: fill `name`/`dob`/`time`/`place` from the chosen `Profile` (same fields
  `toggleUseMyDetails` already sets today) and store the profile's `id` in new per-side state
  (`boyProfileId` / `girlProfileId`).
- Editing any field on a side afterward clears that side's stored `profileId` — fields remain fully
  editable post-autofill (confirmed preference), this just stops a since-edited side from being
  treated as "still this saved profile" later (relevant for §3).
- Empty state (no saved profiles yet): sheet shows a message + link to create one, same pattern as
  the existing "add your birth details" hint on the disabled "This is me" checkbox.

**Bug fix:** `toggleUseMyDetails` currently hardcodes `boy:` unconditionally. It will look up the
signed-in user's own gender (`user.gender`, same source `Profile.gender` uses) and fill Girl's
Details instead when the user is female (defaulting to Boy's Details when gender is
male/other/unset, preserving today's behavior for the common/default case). It will also record
`boyProfileId`/`girlProfileId` as the user's own primary profile id, so "this is me" matches also
benefit from real chat grounding in §3.

### 2. General koota-meaning explainers

New i18n keys under `compatibilityPage.kootaMeaning.<Key>` (one entry per koota, all 7 languages),
each a short 1-2 sentence explainer of what that koota measures — content modeled on the reference
screenshot (Varna → mental/spiritual compatibility; Vashya → mutual dominance/influence; Tara →
destiny/fortune; Yoni → physical/sexual compatibility; GrahaMaitri (displayed "Maitri") → mental
compatibility & love; Gana → temperament; Bhakoot → love/family welfare; Nadi → health & progeny).

A small `KOOTA_LABELS`/`KOOTA_MEANING_KEYS` lookup in `compatibility/page.tsx` maps the backend's
`kutaDetails[].name` (`Varna`, `Vashya`, `Tara`, `Yoni`, `GrahaMaitri`, `Gana`, `Bhakoot`, `Nadi`) to
the display label + i18n meaning key (backend says `GrahaMaitri`, display label is `Maitri`).

Render, per koota card: display name → general meaning (new) → existing computed
`kutaDetails[].description` (this couple's specific result) → `obtained`/`maximum` score. Pure
additive frontend content; no backend or `MatchmakingResponse` schema change.

### 3. Grounded "Ask AI"

- `lib/chat-handoff.ts`: change the payload from a bare string to a small JSON object
  `{ message: string; compareProfileId?: string }`, still under the same sessionStorage key (single
  producer/consumer pair, safe to change shape).
- `lib/swarm-api.ts` `streamChat()`: add `compareProfileId?: string` to `opts`, forward it in the
  POST body when present — same pattern already used for `chartId`.
- `components/ai-chat/ChatConversation.tsx`: on mount, read the JSON payload instead of a bare
  string, pass `compareProfileId` through to the initial `sendMessage`/`streamChat` call.
- `app/compatibility/page.tsx` `askAstrologer()`:
  - Always build the handoff message from the **full** report: all 8 koota name+score pairs and
    Mangal Dosha for both people — not just the red-flag subset — so the visible first chat message
    (and thus what the AI is responding to) reflects the complete result, matching the "answer
    should be based on this report" ask.
  - Set `compareProfileId`: only when exactly one side's stored `profileId` is the user's own
    primary profile (i.e. that side came from "This is me") **and** the other side has a stored
    `profileId` from a picked saved profile (not freehand-typed, not edited-after-pick). In that
    case, `compareProfileId` = the other side's profile id — this is the shape
    `buildSecondChartFacts` expects (compare the caller's own chart against one named saved
    profile). Any other combination (both freehand, both picked-but-neither-is-me, one edited after
    picking) leaves `compareProfileId` unset, falling back to the enriched text-summary-only
    behavior — never a hard error, just less grounding.

No changes to `POST /v1/matchmaking` — it keeps taking raw birth data for both people regardless of
whether either came from a saved profile; the profile *ids* are tracked purely client-side, used
only for the later chat handoff.

## Testing

- Manual, in-browser (dev server): pick a saved profile for each side, confirm gender filtering and
  autofill correctness; edit a field after picking and confirm the stored profileId clears; run a
  match with two freehand people and confirm "Ask an Astrologer" still works with the enriched
  summary and no `compareProfileId`; run a match using "This is me" (as both a male and a female
  test account, or by editing a test profile's gender) + one picked saved profile, tap "Ask an
  Astrologer", and confirm the network request to `/v1/chat` includes `compareProfileId` and that
  the reply reflects real synastry facts (not just the text summary).
- No saved profiles on the account: confirm the picker's empty state renders instead of erroring.

## Out of scope

- No visual redesign of the results screen (gauge/needle, circular per-koota rings, Manglik-report
  avatar photos, "Astrotalk Conclusion" branding) — confirmed with the user these were reference
  inspiration only, not a requested rebuild.
- No new "Open Kundli" tab/nav — `/v1/profiles` + the new picker sheet cover the same need.
- No backend/schema changes — every backend piece this relies on (`/v1/profiles`, `compareProfileId`
  grounding) already exists and is deployed.
