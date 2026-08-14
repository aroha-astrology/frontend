# Bespoke Report Screens — Status & Plan

_Last updated: 2026-08-13 (all screens complete)._
_Original date: 2026-08-13. Working dir: `C:\dev\aroha-astrology\frontend` (NOT the scratch checkout)._

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

## Status: complete

All 11 report types that render through `/reports/[id]` now have a bespoke screen, deployed and
verified live. Adding a 12th is **one entry** in `components/reports/designed-screens.tsx` plus
its folder — the page itself has not been edited since the registry landed.

Still on the generic path, if ever wanted:
- `relationship_monthly` — nearly free; the shared monthly set already covers its whole shape
- `remedies`
- `match_report` — renders via `/compatibility`, a different path entirely
- `name_change` — redesigned separately, earlier

See the memory note `aroha-report-screens-complete-2026-08-13` for the full pattern, the
sheet's panel coordinates, and the gotchas.
