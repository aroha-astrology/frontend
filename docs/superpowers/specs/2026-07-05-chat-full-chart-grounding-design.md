# AI Chat: Full-Chart Grounding (Drop Persona Gating)

## Problem

The AI chat backend still gates chart facts behind a `persona` (`career`/`love`/`health`/`general`) that determines which slice of the chart gets injected into the LLM prompt — e.g. only the `love` persona ever sees the 7th house, Venus placement, Mangal Dosha, or marriage-timing signals.

The frontend no longer sends `persona` at all: the multi-astrologer picker (`2026-07-04-ai-chat-astrologer-picker-design.md`) was replaced by a single unified "Aroha" astrologer (`lib/personas.ts`), and `streamChat()` in `lib/swarm-api.ts` has no persona field. Since `ChatRequestSchema` defaults missing `persona` to `'general'`, **every chat message today is silently graded as `general`** — the thinnest fact slice (Ascendant + top-3 yogas + current dasha only). A question like "when will I get married" never sees the 7th-house/Venus/Mangal-Dosha/dasha-timing facts that already exist in the code, because nothing ever requests the `love` persona anymore.

Separately, even the `love` branch only ever reasons about the *currently active* dasha and *right-now* transits — it can say "now is/isn't favorable" but never "your window is likely 2027–2029," because the full future mahadasha→antardasha→pratyantardasha timeline (real dates, already computed at chart-generation time) is discarded down to just `currentMahadasha`/`currentAntardasha` before it reaches the prompt.

Also, even merging all 4 personas' fact slices would still only cover houses {2,6,7,8,10,11,12} — houses 1,3,4,5,9 (self, siblings/courage, home/mother, children/education, fortune/father) are never surfaced for any persona, and no persona surfaces planetary aspects (drishti) at all.

## Goal

Replace persona-gated grounding with one comprehensive, always-on natal-facts builder that:
1. Covers all 12 houses (sign, lord, lord's placement+dignity, occupants, natal aspects).
2. Surfaces all present doshas and yogas, not a curated subset.
3. Projects the nearest *future* favorable dasha window (mahadasha→antardasha→pratyantardasha) for marriage/career/health significators, not just the current period.
4. Retires the `persona` concept end-to-end (schema, route, service, prompt, dead frontend picker) since the product is one astrologer that can be asked anything.

## Non-goals

- No topic classification/keyword routing — the whole point is that grounding no longer depends on guessing what the user meant.
- No change to the SSE streaming protocol, history/summary compaction, or auth/consent middleware.
- No tool-calling / on-demand LLM fact retrieval (considered, deferred as unnecessary complexity for now).
- No change to how the natal chart itself is computed/stored (`kundli.chartData`/`dashaData`/`yogaData`/`doshaData` shapes are unchanged) — only what's *read* from them for chat.

## Architecture

### `backend/src/lib/astro-engine/dashas/vimshottari.ts`

Add a `forceFullDepth` param (default `false`) to `buildSubPeriods`, and export it:

```ts
export function buildSubPeriods(
  startPlanet: Planet, startDate: Date, parentYears: number,
  depth: number, currentDate: Date, maxDepth = 4,
  forceFullDepth = false,
): DashaPeriod[]
```

When `forceFullDepth` is `true`, the recursive call happens regardless of `isActive` (today it only recurses for the active branch). Default stays `false`, so `calculateVimshottariDasha` and every existing caller is byte-for-byte unchanged. This lets chat-grounding compute antardasha/pratyantardasha for an arbitrary *future* mahadasha on demand, without touching the core dasha computation used elsewhere (kundli generation, onboarding, dasha-reading UI).

### `backend/src/lib/chat-grounding.ts`

`buildGroundingFacts(src, persona)` → `buildFullChartFacts(src)`. For all 12 houses, emit one fact line: sign, lord, lord's natal house + dignity (reusing `dashaLordTransitQuality`), occupants, and aspecting planets. Aspects computed by a small local helper (house-number distance: every planet aspects the 7th-from-itself; Mars also 4th/8th; Jupiter also 5th/9th; Saturn also 3rd/10th) — no dependency on the yogas engine's internals.

Always include: every present dosha from the full `DoshaAnalysis` (mangal, kaalSarp, sadeSati, pitra, kemDruma, grahan, guruChandal), every present yoga (name + houses + description), current dasha (unchanged logic), and current Jupiter/Saturn transit-house-from-Ascendant (generalized from the existing love/career-only checks to always run).

**New: `findFavorableWindow(dasha, significatorLords, now)`** — walks the future mahadashas in chronological order starting from "now," and for each of the next 3, computes antardasha→pratyantardasha via `buildSubPeriods(..., forceFullDepth: true)` and returns the first period at pratyantardasha granularity whose lord is in `significatorLords`. Called three times per chat message with each domain's significator set:
- Marriage: 7th lord, Venus, 7th-house occupants.
- Career: 10th lord, Saturn, 10th-house occupants.
- Health: 6th/8th/12th lords and occupants (as "period to watch," not favorable — framed as caution, not opportunity).

If no match within the 3-mahadasha lookahead, the fact is omitted — never fabricated.

### `backend/src/lib/swarm/agents/scholar.ts`

Collapse `PERSONA_ROLE` (4 variants) into one `AROHA_ROLE` system-prompt block carrying every previously persona-gated directive: marriage/Manglik-Dosha named handling, career finance/trading caution (never a specific stock/ticker), health's mandatory doctor disclaimer (never diagnose/name a disease), plus general's existing education/legal/parents/remedies notes. Shared blocks (`GROUNDING_INSTRUCTION`, `CONTEXT_DISCIPLINE`, `RESPONSE_DISCIPLINE`, `OUTPUT_STYLE`) are untouched. `buildChatMessages`/`scholarStream` drop the `persona` parameter.

`MAX_CONTEXT_CHARS`: 4000 → 6000 to comfortably fit the larger fact block; still hard-clipped.

### `backend/src/modules/astro/astro.schemas.ts` / `astro.routes.ts` / `astro.service.ts`

Remove `ChatPersonaSchema` and the `persona` field from `ChatRequestSchema`; drop the parameter from `chatStream`/`scholarStream` call chain.

### Frontend cleanup

Delete `components/ai-chat/AstrologerList.tsx` — already broken today (imports `PERSONAS` from `lib/personas.ts` and `ChatPersona` from `lib/swarm-api.ts`, neither of which exists anymore since the single-astrologer redesign). Not rendered anywhere; safe to remove outright.

## Error handling

Unchanged fallback pattern: no kundli yet → all facts omitted, model told to invite the user to finish onboarding. Malformed/missing dasha data → favorable-window facts skipped individually (best-effort, matching the existing `currentTransitSignIndex` pattern). A domain with no significator match in the lookahead window simply has no favorable-window fact — the model is never told to invent one (`GROUNDING_INSTRUCTION` already forbids this).

## Testing

- New unit tests for `buildFullChartFacts`: all 12 houses present, aspect table matches Mars/Jupiter/Saturn special-aspect rules, dignity correctly reused, all 7 dosha types surface when `present`.
- New unit tests for `findFavorableWindow`: correct nearest antardasha/pratyantardasha for a synthetic dasha fixture, respects the 3-mahadasha lookahead cap, returns `undefined` (not a fabricated guess) when nothing matches.
- Rewrite `backend/test/scholar.spec.ts`, which currently asserts 4 *distinct* persona prompts (the thing being removed). New version asserts the single unified prompt contains every previously persona-gated directive (marriage/Manglik, stock/ticker caution, doctor disclaimer, education/legal/parents/remedies) plus the shared clarifying-question discipline.
- `npm run build` / `tsc` across the backend to confirm no dangling `ChatPersona` references after removal.
