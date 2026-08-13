# Bespoke Report Screens — Status & Plan

_Last updated: 2026-08-13. Working dir: `C:\dev\aroha-astrology\frontend` (NOT the scratch checkout)._

Rebuilding each report type's screen to the design, one at a time. Frontend only — no backend,
schema, or API changes in any of this work.

---

## Status at a glance

| # | Report | `reportKey` | State |
|---|---|---|---|
| 1 | Marriage | `marriage` | ✅ Deployed (`afa2a6e`) |
| 2 | Kundli Milan | `kundli_milan` | ✅ Deployed (`1ee30fc`, Vercel `frontend-6w2xidctm`) |
| 3 | **True Love** | `true_love` | 🟡 **Built, green, UNCOMMITTED** |
| 4 | Wealth | `wealth` | ⬜ Not started |
| 5 | Career | `career_monthly` | ⬜ Not started |
| 6 | Numerology | `numerology` | ⬜ Not started |
| 7 | Past Life | `past_life` | ⬜ Not started |
| 8 | Baby Name | `baby_name` | ⬜ Not started |
| 9 | Health | `health_monthly` | ⬜ Thin data — see below |
| 10 | Finance | `finance_monthly` | ⬜ Thin data — see below |

Not in this plan: `name_change` (already redesigned separately), `remedies`,
`relationship_monthly`, `match_report` (renders via `/compatibility`, not `/reports/[id]`).

---

## 🟡 Report #3 — True Love: finish this first

**The code is written and passing but is uncommitted in the working tree on branch `main`.**
`git status` shows it. Don't `checkout`/`reset` without stashing.

### Already verified green
- `npx tsc --noEmit` → exit 0
- `npx vitest run` → 441/441 (8 new in `lib/true-love-report-view.test.ts`)
- i18n: 20 keys × 7 languages, programmatically confirmed present
- Visual check in **en** done and read — hero art, subtitle, both dials, tilt gauge, timing card
  all correct

### Remaining steps
1. **Finish the visual check.** Dev server + screenshot; `hi` and `ta` were not yet captured.
   - `npx next dev -p 3113`, then open `/legal/dev-preview-tl`
   - Preview must live under `/legal/*` — `AuthGuard`'s `PUBLIC_PATHS` redirects anything else
     to sign-in
   - Assert no raw `trueLoveReport.*` keys survive in `document.body.innerText`
2. **Delete the throwaways**: `app/legal/dev-preview-tl/` and `shot2.mjs`
3. **Re-verify**: `tsc` + `vitest` + `npx next build`
   - After deleting a route, stale `.next/types/app/<route>/` causes phantom TS2307s — delete them
4. **Commit**, push to `main`, confirm the Vercel deploy, verify on `app.arohaastrology.in`
   (never the per-deployment URL)

### Files in the uncommitted change
```
NEW  lib/true-love-report-view.ts               view-model (React/i18n/Tailwind-free)
NEW  lib/true-love-report-view.test.ts          8 tests
NEW  components/reports/true-love/TrueLoveReportView.tsx
NEW  components/reports/true-love/LoveDialsCard.tsx    two dials: romance + partnership
NEW  components/reports/true-love/TiltGauge.tsx        love ←→ arranged marker
NEW  components/reports/designed-screens.tsx    the reportKey → screen registry
NEW  public/true-love/couple.png                sliced hero
MOD  app/reports/[id]/page.tsx                  now reads the registry
MOD  components/reports/marriage/MarriageReportView.tsx   updated for the renamed card
MOD  i18n/resources.ts                          trueLoveReport × 7 languages
MOD  scripts/assets/{crop-assets.py,asset-manifest.json}  alpha:null support
REN  marriage/TimingCard.tsx → components/reports/TopWindowCard.tsx
```

---

## The pattern for reports #4 onward

Established over three screens. Follow it in order.

1. **Read the generator first.** `jyotish-backend/src/lib/astro-engine/reports/<report>.ts` and
   `src/config/report-sections.ts` for the section ids. Never promise a design element before
   confirming the data exists — this has caught a real gap on every report so far.
2. **Slice only what has no equivalent.** Usually just the hero. Add a section to
   `scripts/assets/asset-manifest.json` with `"sheet": "allReports"`, then run
   `python scripts/assets/crop-assets.py`. Existing assets must re-slice byte-identically —
   that's the regression check.
3. **View-model in `lib/<report>-report-view.ts`** — no React, no `t()`, no Tailwind literals
   (the JIT does not scan `lib/`). Plus a `SECTION_ICON` map of lucide icon *names*. Unit-test it.
4. **Components in `components/reports/<report>/`** — only for what no existing card covers.
5. **Register it**: one entry in `components/reports/designed-screens.tsx`. No page edit needed.
6. **i18n in all 7 languages** (`en hi bn mr te ta gu`) — script the insertion into
   `i18n/resources.ts`, anchored on an existing block.
7. **Verify**: tsc → vitest → visual check → `next build` → commit → push → confirm live.

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
| Wealth | 20 | **near-identical to marriage** — score/windows/ageBands/archetype/arc/doshaYoga |
| True Love | 16 | same skeleton as marriage (this is why #3 was cheap) |
| Past Life | 15 | Rahu/Ketu houses, karmic archetype |
| Health (monthly) | 11 | thin |
| Finance (monthly) | 10 | thinnest |

**Wealth (#4) is the next cheap win** — same skeleton as marriage and True Love, so it's mostly
composition plus a hero slice.

**Health and Finance monthly** have too little behind them to justify a bespoke screen; they'd be
a hero image on the generic reader. Worth reconsidering whether to build them at all.

---

## Gotchas that have cost time

- **ESLint is not configured in this checkout.** `next lint` opens an interactive setup prompt and
  hangs. The real gates are `npx tsc --noEmit` and `npx next build`.
- **`tsc` cannot catch an unused prop.** Making `ReportHero` shared but leaving its body hardcoded
  to marriage's art compiled fine and shipped the wrong image. Only the visual check found it.
- **Fabricated preview data must match the generator's real scale.** Archetype traits are **0–10**
  and exactly **5** — inventing 0–100 values produced "90/10" bars that looked like a component bug.
- **Two verdicts for one score.** `GunaKootaBreakdown` bands by percentage (≥75% excellent) while
  the backend bands the classical 36-point scale (33+ excellent). Use `showSummary={false}` when
  the screen already shows that total.
- **Design-sheet hero art is a downgrade for the list thumbnails.** `public/reports/*.png` are
  300–430px; the sheet's panels are ~100px. Slice heroes for the *screen*, never overwrite the
  list art.
- **Judge keying by the background.** `alpha: null` (no keying) when the subject is the darkest
  thing in the crop; a shallow `[2,14]` ramp for a dark subject on near-black; steep `[12,48]` for
  bright art on flat black.
- **Screens ship with no feature flag** and go straight to every buyer of that report. Contrast the
  house rule that new home cards ship dark — worth deciding deliberately each time.
- **Neither shipped screen has been seen against a real generated report** — only fabricated sample
  data, since `/reports/[id]` needs a signed-in account holding a purchase.
