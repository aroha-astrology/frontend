# Bespoke Report Screens — Status & Plan

_Last updated: 2026-08-13. Working dir: `C:\dev\aroha-astrology\frontend` (NOT the scratch checkout)._

Rebuilding each report type's screen to the design, one at a time. Frontend only — no backend,
schema, or API changes in any of this work.

---

## Status at a glance

| # | Report | `reportKey` | State |
|---|---|---|---|
| 1 | Marriage | `marriage` | ✅ Deployed (`afa2a6e`) |
| 2 | Kundli Milan | `kundli_milan` | ✅ Deployed (`1ee30fc`) |
| 3 | True Love | `true_love` | ✅ Deployed (`084ffa5`) |
| 4 | Wealth | `wealth` | ⬜ Not started — next up |
| 5 | Career | `career_monthly` | ⬜ Not started |
| 6 | Numerology | `numerology` | ⬜ Not started |
| 7 | Past Life | `past_life` | ⬜ Not started |
| 8 | Baby Name | `baby_name` | ⬜ Not started |
| 9 | Health | `health_monthly` | ⬜ Thin data — see below |
| 10 | Finance | `finance_monthly` | ⬜ Thin data — see below |

All three shipped screens verified live: `curl -o /dev/null -w "%{http_code}" https://app.arohaastrology.in/<report>/...` returns 200 for each hero asset.

Not in this plan: `name_change` (already redesigned separately), `remedies`,
`relationship_monthly`, and `match_report` (renders via `/compatibility`, not `/reports/[id]`).

---

## Report #4 — Wealth: start here

Cheapest remaining screen. Wealth's generator output (20 score fields) is structurally
near-identical to marriage and True Love — score, windows, ageBands, archetype, arc, doshaYoga —
so this should be mostly composition against the existing shared components, plus one hero slice.

Follow the pattern below exactly; it's been proven over 3 screens now.

---

## The pattern (proven over 3 screens)

1. **Read the generator first.** `jyotish-backend/src/lib/astro-engine/reports/<report>.ts` and
   `src/config/report-sections.ts` for the section ids. Never promise a design element before
   confirming the data exists — this has caught a real gap on every report so far.
2. **Slice only what has no equivalent.** Usually just the hero. Add a section to
   `scripts/assets/asset-manifest.json` with `"sheet": "allReports"`, then run
   `python scripts/assets/crop-assets.py`. Existing assets must re-slice byte-identically —
   that's the regression check. Judge keying by the background: `alpha: null` (no keying) when
   the subject is the darkest thing in the crop; shallow `[2,14]` for a dark subject on
   near-black; steep `[12,48]` for bright art on flat black.
3. **View-model in `lib/<report>-report-view.ts`** — no React, no `t()`, no Tailwind literals
   (the JIT does not scan `lib/`). Plus a `SECTION_ICON` map of lucide icon *names*. Unit-test it.
4. **Components in `components/reports/<report>/`** — only for what no existing card covers.
5. **Register it**: one entry in `components/reports/designed-screens.tsx`. No page edit needed.
6. **i18n in all 7 languages** (`en hi bn mr te ta gu`) — script the insertion into
   `i18n/resources.ts`, anchored on an existing block.
7. **Verify**: tsc → vitest → visual check (fabricated preview data under `/legal/dev-preview-*`,
   since `AuthGuard`'s `PUBLIC_PATHS` blocks anything else) → `next build` → commit → push →
   confirm live with curl, not just "push succeeded".

### Components already shared (all take props, none hardcode a report's keys)
`ReportHero` · `AnalysisAccordion` · `StrengthsCautions` · `TopWindowCard` ·
`GunaKootaBreakdown` · `ArchetypeCard` · `DecadeArcCard` · `AgeBandHeatStrip` ·
`ReportHeaderCard` · `ReportGemstonesCard` · `ReportVerdictCard`

---

## Generator data audit (drives the build order)

Score fields each generator actually produces:

| Report | Fields | Notes |
|---|---|---|
| Baby Name | 35 | nakshatra syllables, candidate names — needs new blocks |
| Numerology | 30 | richest; `isLoShuGrid`/`isChallengeNumbers`/`isNamePlanes` guards already exist |
| Career (monthly) | 23 | monthScore, tone, workArchetype, industryFit, sub-periods |
| Wealth | 20 | near-identical to marriage/True Love — cheapest remaining |
| Past Life | 15 | Rahu/Ketu houses, karmic archetype |
| Health (monthly) | 11 | thin |
| Finance (monthly) | 10 | thinnest |

**Health and Finance monthly** have too little behind them to justify a bespoke screen; they'd be
a hero image on the generic reader. Worth reconsidering whether to build them at all.

---

## Gotchas that have cost time

- **ESLint is not configured in this checkout.** `next lint` opens an interactive setup prompt and
  hangs. The real gates are `npx tsc --noEmit` and `npx next build`.
- **`tsc` cannot catch an unused prop.** Making `ReportHero` shared but leaving its body hardcoded
  to marriage's art compiled fine and shipped the wrong image on Kundli Milan. Only the visual
  check found it.
- **Fabricated preview data must match the generator's real scale.** Archetype traits are **0–10**
  and exactly **5** — inventing 0–100 values produced "90/10" bars that looked like a component bug.
- **Two verdicts for one score.** `GunaKootaBreakdown` bands by percentage (≥75% excellent) while
  the backend bands the classical 36-point scale (33+ excellent). Use `showSummary={false}` when
  the screen already shows that total.
- **Design-sheet hero art is a downgrade for the list thumbnails.** `public/reports/*.png` are
  300–430px; the sheet's panels are ~100px. Slice heroes for the *screen*, never overwrite the
  list art.
- **A "done in this session" claim can go stale by the next one.** True Love was flagged
  "uncommitted, needs finishing" in one session's handoff notes, but the session actually
  finished and pushed it before ending — a live curl check caught this, a memory note alone did
  not. **Verify live state before trusting a prior session's status note, your own included.**
- **A stale local checkout can look like lost work.** If `git status` shows unexpected uncommitted
  changes, diff them against `origin/main` before assuming they're in-progress work worth
  preserving — they may be byte-identical to commits that already landed from elsewhere.
- **Screens ship with no feature flag** and go straight to every buyer of that report. Contrast the
  house rule that new home cards ship dark — worth deciding deliberately each time.
- **No shipped screen has been seen against a real generated report** — only fabricated sample
  data, since `/reports/[id]` needs a signed-in account holding a purchase.
