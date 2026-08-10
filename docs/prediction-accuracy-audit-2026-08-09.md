# Prediction & Report Accuracy — Deep Audit

**Date:** 2026-08-09
**Scope:** `jyotish-backend` astro engine + LLM layer, `frontend` chart layer
**Method:** full read of the calculation → interpretation → narration → feedback chain, cross-checked against classical Jyotish practice and current LLM-grounding research.

---

## Status — shipped 2026-08-10

Everything that was built-but-unused is now wired into the live path. Backend test suite: **2199 passing, +26 new, 14 pre-existing failures unchanged** (verified identical at HEAD — `users`/`auth`/`admin-price`/`horoscope-batch`/`reports-service`, all unrelated).

| # | Item | Status |
|---|---|---|
| 1 | Retrograde + combustion in grounding | ✅ shipped |
| 2 | Shadbala wired + yoga strength-gating (`STRENGTH RULE`) | ✅ shipped |
| 3 | `birthTimeAccuracy` hedging for `approximate` charts | ✅ shipped |
| 4 | Gemini reasoning tier for paid reports | ⚠️ **plumbed, OFF** — see below |
| 7 | Vargas persisted; frontend duplication now dead | ✅ shipped |
| 8 | Bhava Chalit + `CHALIT RULE` | ✅ shipped |
| 11 | Varshphal wired into chat grounding | ✅ shipped |

**Item 4 needs one manual step.** `GEMINI_REASONING_MODEL` defaults to empty, which resolves to `GEMINI_MODEL` — so *nothing changes until you set it on EC2*. That is deliberate: the free key pool has per-model RPD quotas, and pointing paid report traffic at an unverified model id would break generation outright. Confirm the model id against the live keys, then set the env var and restart.

**Correction to the original audit:** it stated `GenerationProfile` already had an unused `model?` field. It did not — `model?` was on `LLMRequestOptions` (request-level). `GenerationProfile.model` was added as part of this work so one profile change routes all ~30 report call sites instead of editing each.

Still open from the backlog: **#5 (prediction outcome table)**, #6 (golden reference charts), #9 (chain-of-verification), #10 (True Node / True Chitra), #12 (rectification), #13 (Avastha / Graha Yuddha), #14 (KP sub-lord). #5 remains the one that makes all the others measurable.

---

## TL;DR

The chart math is solid and the grounding layer is genuinely above-average for this market. **Accuracy is not being lost in the ephemeris — it is being lost in three places:**

1. **Planetary strength is computed but never used.** `calculateShadbala()` is implemented, tested, and wired to exactly nothing on the live path. Classical prediction is *strength-gated* — a yoga without strength doesn't fructify. We currently narrate every yoga as if equally live.
2. **Every prediction runs on `gemini-3.1-flash-lite`.** One model, the cheapest tier, for a ₹500 flagship report and for a one-line daily horoscope alike.
3. **There is no accuracy feedback loop.** We collect thumbs up/down as a global counter. Nothing attributes a rating to a *prediction*, so nothing can ever be tuned against outcomes.

Rough impact ranking: **strength-gating > model tiering > retrograde/combustion facts > birth-time confidence > Bhava Chalit > outcome loop.**

---

## Layer 1 — Ephemeris & chart mathematics

### What we're doing (and doing right)

| Item | Status | Where |
|---|---|---|
| Swiss Ephemeris (WASM), sidereal + speed flags | ✅ | [planetPositions.core.ts:169](../backend/src/lib/astro-engine/calculations/planetPositions.core.ts#L169) |
| Real `.se1` data embedded (`seas_18`/`semo_18`/`sepl_18` → 1800–2399 CE) | ✅ full precision, not the Moshier fallback | `node_modules/swisseph-wasm/wasm/swisseph.data` |
| Lahiri ayanamsa default, Krishnamurti + Raman selectable | ✅ | [planetPositions.core.ts:79-83](../backend/src/lib/astro-engine/calculations/planetPositions.core.ts#L79-L83) |
| `set_sid_mode()` correctly called before **every** `houses_ex` | ✅ (a classic bug we don't have) | [planetPositions.core.ts:250](../backend/src/lib/astro-engine/calculations/planetPositions.core.ts#L250) |
| Whole-sign default house system | ✅ correct for Parashari | `schema.ts:41` |
| Historical timezone via `Intl.DateTimeFormat` on the birth date | ✅ better than the code comment claims — Node's ICU carries historical transitions, so Bombay/Calcutta Time and the 1942–45 Indian DST resolve correctly | [kundli.service.ts:116-155](../backend/src/modules/kundli/kundli.service.ts#L116-L155) |
| Retrograde detected from speed sign | ✅ computed | [planetPositions.core.ts:183](../backend/src/lib/astro-engine/calculations/planetPositions.core.ts#L183) |
| Ashtakavarga bindu totals invariant-tested (sum 337) | ✅ genuinely good test design | `test/astro-engine.spec.ts` |
| Ephemeris LRU cache + optional worker pool | ✅ | `calculations/ephemeris-cache.ts` |

### What we're missing

**M1 — Mean Node only, no True Node option.**
`SE_MEAN_NODE = 10` is hardcoded at [planetPositions.core.ts:65](../backend/src/lib/astro-engine/calculations/planetPositions.core.ts#L65).

This is *defensible* — mean node matches classical Parashari ("always retrograde") and most Indian texts. But the two diverge by up to **±1.29°**, enough to put Rahu/Ketu in a different sign or nakshatra pada. **Jagannatha Hora uses the True Node.** Any user who cross-checks us against JHora on a borderline chart will see a different Rahu sign and conclude we're broken. Swiss Ephemeris exposes True Node as `SE_TRUE_NODE = 11` — this is a one-constant change plus a preference column we already have the pattern for.

**M2 — No True Chitrapaksha ayanamsa option.**
We offer Lahiri (official) but not True Chitra. They differ by 30–60 arc-seconds. That sounds trivial until you note the Moon covers 30–60″ in 1–2 minutes, which shifts **Vimshottari dasha start dates by up to ~12 days** and can flip a KP sub-lord entirely.

**M3 — Whole-sign discards the real cusps.**
[planetPositions.core.ts:266-268](../backend/src/lib/astro-engine/calculations/planetPositions.core.ts#L266-L268) overwrites `cusp` with `houseSignIndex * 30` when `system === 'W'`. So `HouseData.cusp` is *not* usable for Bhava Chalit under our default. Ascendant degree is still available separately, so Sripati/equal-from-lagna Bhava Chalit is derivable — but nothing derives it. See M8.

**M4 — Hardcoded IST in one path.**
[astro.service.ts:428](../backend/src/modules/astro/astro.service.ts#L428): `const timezoneOffset = 5.5;`. Fine if that path is India-only panchang; a latent wrong-day bug the moment it isn't. Worth an explicit comment or a real lookup.

**M5 — Vimshottari year = 365.25 days.**
[vimshottari.ts:17](../backend/src/lib/astro-engine/dashas/vimshottari.ts#L17). Standard, and matches most software. Drift vs. the tropical year is ~0.94 days across a full 120-year cycle — acceptable, but it means our dates will differ from software using 365.2425 by up to a day on late sub-periods. Document it rather than change it.

**M6 — No geocentric/topocentric option.** Standard practice is geocentric (what we do). Noted only for completeness — **do not change this**, it would break parity with every other Indian app.

---

## Layer 2 — Classical interpretation

### What we're doing

This layer is the strongest part of the system and is well ahead of a typical astrology app:

- **Vimshottari to 5 levels** + **Yogini** + **Chara** dasha (`dashas/`)
- **Ashtakavarga**: Bhinna + Sarva, **plus Shodhana** (reduction) and **Kakshya** transit gating — `ashtakavarga-shodhana.ts`, `astro-tools/kakshya.ts`
- **Vedha** (transit obstruction) — `astro-tools/vedha.ts`
- **Double transit** (Jupiter+Saturn) — `astro-tools/double-transit.ts`
- **Tara Bala / Chandra Bala** daily quality
- **7 doshas** with real cancellation logic, incl. Sade Sati phase timeline
- **Jaimini layer**: Arudha Lagna, Upapada, Atmakaraka, Karakamsha — `charts/jaiminiPoints.ts`
- **Lal Kitab** karmic profile + blind/pakka-ghar planets
- **D1–D60 divisional charts**
- **Domain confidence scoring** across 15 life domains with transit gating — `dasha-confidence.ts` (this is a genuinely good piece of engineering; it's the thing most competitors don't have)

### What we're missing

**M7 — 🔴 Shadbala is dead code on the live path.**
`calculateShadbala()` exists and is exported ([astro-engine/index.ts:16](../backend/src/lib/astro-engine/index.ts#L16)). Its **only** consumer is `varshphal/varsheshwara.ts` — and Varshphal itself has **zero** references outside its own directory. Both are fully-built, unwired systems.

Why this is the #1 accuracy gap: classical prediction is conditional on strength. "Gajakesari Yoga is present" and "Gajakesari Yoga is present *and* Jupiter has 480 virupas (strong), so it actually delivers" are completely different predictions. Right now we emit the first. Every yoga reads as equally potent, which is exactly the "generic answer" failure mode users pattern-match as fake.

**M8 — No Bhava Chalit / cuspal house placement.**
Zero hits for `chalit`, `bhavaMadhya`, `bhavaBala` in the entire backend. When the Lagna sits near a sign boundary, whole-sign and Bhava Chalit disagree on which house a planet actually occupies — and standard practice is that **Chalit governs house-level event prediction** while Rasi governs dignity and aspect. A planet at 28° Aries with a 2° Aries Lagna is in H1 by Rasi and effectively H12 by Chalit. We currently only ever say H1.

**M9 — 🟡 Retrograde and combustion never reach the LLM.**
`isRetrograde` is computed and persisted. Combustion is computed inside `yogas/index.ts:190` as part of an internal 0–100 strength score. **Neither appears anywhere in `chat-grounding.ts`** (0 matches for `Retrograde`, 0 for `combust`). A combust Mercury and a strong Mercury produce the same narration today. This is the cheapest high-value fix in the document — the data already exists, it just isn't in the fact list.

**M10 — No Avastha, no Graha Yuddha, no Vimsopaka Bala.**
Zero hits for `avastha`, `yuddha`, `vimsopaka`. Avastha (Baladi/Deeptadi) and planetary war are standard BPHS strength modifiers; Vimsopaka is the standard way to weight divisional-chart dignity into a single number. Lower priority than M7 but they're the same family: **we compute placements richly and strength barely at all.**

**M11 — No Varshphal in any user-facing output.**
`astro-engine/varshphal/` is built (Varsheshwara, Muntha, Panchavargiya) and referenced nowhere. This is a fully-built annual-prediction feature sitting on the shelf — arguably a shippable product, not just an accuracy fix.

**M12 — No KP layer.**
No sub-lord, no cuspal sub-lord, no ruling planets (1 incidental `subLord` hit). KP practitioners claim ~90% timing precision vs 60–70% for pure Parashari; treat that number as marketing, but the *structural* point holds: KP's sub-lord is a sharper timing discriminator than Mahadasha alone, and we already compute everything it needs (we'd need Placidus cusps, which `houses_ex` already returns and we currently throw away for whole-sign).

**M13 — Frontend re-implements the varga math.**
[frontend/lib/divisional-charts.ts](../frontend/lib/divisional-charts.ts) (292 lines) is a hand-port of the backend's 844-line `charts/divisionalCharts.ts`, because the backend never persists `chart.divisionalCharts`. Its own header says "keep the math below in sync." Two divergent implementations of D1–D60 is a silent-wrong-answer generator: the LLM reasons over the backend's vargas while the user *looks at* the frontend's. Fix the cause (persist vargas on the kundli row), delete the port.

---

## Layer 3 — LLM narration

### What we're doing

The grounding discipline here is better than most production RAG systems I've seen:

- `chat-grounding.ts` (1177 lines) emits a **pre-computed fact list** — the LLM narrates, never calculates. The header states this explicitly and the code honours it.
- Per-task **generation profiles** with hand-tuned temperature (0.0 for extraction → 0.9 for creative copy) — `config/llm.ts`
- **Structured output** via `responseSchema` where it matters ([gemini-client.ts:162](../backend/src/lib/llm/gemini-client.ts#L162))
- Deterministic pre-computation for anything falsifiable: name-change numerology is calculated then **digit-verified against the LLM's output** (`llm/reports/name-change.ts:201`) — this is exactly the right pattern
- Explicit anti-hallucination framing ("GIVEN FACTS", "never invent an extra name")
- Documented fixes for temporal anchoring, correction honesty, memory layering (see MEMORY.md chat-fix cluster)

### What we're missing

**M14 — 🔴 One model tier for everything.**
[env.ts:110](../backend/src/config/env.ts#L110): `GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite')`, and `config/llm.ts:7` feeds it to **every** profile. Flash-lite is the cheapest tier — appropriate for classification, extraction, and translation; a hard ceiling on multi-factor astrological synthesis.

The paid ₹500 report and a free daily one-liner get identical reasoning capacity. `GenerationProfile` already has a `model?` override field ([llm.ts:37](../backend/src/config/llm.ts#L37)) that nothing uses. Route the paid-report and deep-chat profiles to a reasoning-tier model; leave extraction/translation on flash-lite. Cost impact is bounded because report volume is low relative to chat.

**M15 — No verification pass on generated predictions.**
We verify *numerology digits* but not *astrological claims*. Nothing checks that a generated sentence like "Saturn in your 7th brings delays in marriage" corresponds to an actual fact in the grounding set. Chain-of-verification / LLM-as-judge over the fact list is the standard mitigation, and research on domain-grounded generation puts hallucination reduction at 42–68% when this is added. Ours is cheap to build because **the ground truth is already a flat list of strings.**

**M16 — Birth-time confidence never reaches the narration.**
`birthTimeAccuracy` (`exact` | `approximate` | `unknown`) is captured in the schema and used **only** as a binary gate (`=== 'unknown'` → skip). It is not in the grounding facts. A user who entered "roughly 9am, family memory" gets Ascendant and dasha dates stated with the same confidence as a birth-certificate time — even though a ±30 min error can shift the Lagna a whole sign and the first Mahadasha by months. The fact list should carry the confidence, and the prompt should hedge time-sensitive claims (Lagna, D-charts, dasha dates) when it's low.

**M17 — Dead rectification schema.**
`birthTimeRectified` and `birthTimeRectificationConfidence` columns exist and are **never written or read**. Someone intended a rectification feature. With 5–10 well-dated life events, standard rectification narrows birth time to ~5–15 minutes — and we already collect life events in `user_facts`. This is a strong candidate feature: it's the only thing that improves *every downstream prediction at once*.

---

## Layer 4 — Measurement (the real gap)

**M18 — 🔴 We cannot tell whether any prediction was right.**

- `feedbackCounters` is a **global** metric counter (`feedback.repo.ts:14`)
- The per-user vote log attributes a vote to a *user*, not to a *prediction*
- Nothing records: which facts grounded a prediction, which model produced it, which technique fired, whether the predicted window contained the predicted event

Every accuracy improvement above is therefore **unfalsifiable in production**. We ship changes and hope. The minimum viable fix is one table — `prediction_id → {facts_hash, model, techniques[], domain, window_start, window_end}` — joined to the existing vote, plus a "did this happen?" prompt on windows that have closed. That turns `dasha-confidence.ts`'s HIGH/MEDIUM/LOW labels from a guess into a calibrated number, and gives us the only defensible accuracy claim in this market.

**M19 — No reference-chart regression tests.**
207 spec files, none comparing our output to a known-good chart from JHora/AstroSage. Our tests prove the engine *runs* and that Ashtakavarga totals are internally consistent — not that a 1990-05-20 06:30 Mumbai chart matches what every other tool produces. Three golden charts with asserted planet longitudes, Lagna degree, and dasha start dates would catch an ayanamsa or node regression instantly.

---

## Prioritised backlog

| # | Change | Impact | Effort | Notes |
|---|---|---|---|---|
| 1 | **Surface retrograde + combustion in `chat-grounding.ts`** | High | XS | Data already computed. Pure fact-list addition. |
| 2 | **Wire `calculateShadbala()` into grounding; gate yoga claims on strength** | Very High | S | Function is built and tested. Add a strength tier per planet + "yoga is/isn't supported by strength" line. |
| 3 | **Add `birthTimeAccuracy` to grounding + hedging instruction** | High | XS | One fact line + one prompt clause. Biggest credibility-per-byte win. |
| 4 | **Route paid reports + deep chat to a reasoning-tier model** | Very High | XS | `GenerationProfile.model` override already exists, unused. |
| 5 | **Prediction outcome table + per-prediction feedback** | Very High | M | Unblocks everything else. Do before, not after, the accuracy work. |
| 6 | **3 golden reference-chart tests** | Medium | S | Cheap regression insurance on ayanamsa/node/dasha. |
| 7 | **Persist vargas on the kundli row; delete `frontend/lib/divisional-charts.ts`** | Medium | S | Kills a live divergence risk and 292 lines. |
| 8 | **Bhava Chalit (Sripati) alongside Rasi** | Medium-High | M | Needs cusps preserved (M3). Standard practice for house-level events. |
| 9 | **Chain-of-verification pass on paid reports** | High | M | Judge each claim against the fact list. Ground truth is already a string array. |
| 10 | **True Node + True Chitra as preferences** | Medium | S | Parity with JHora. Prevents "your app is wrong" support tickets. |
| 11 | **Ship Varshphal** | Medium | S | Fully built, zero consumers. Product, not just accuracy. |
| 12 | **Birth-time rectification from `user_facts` life events** | Very High | L | Improves every downstream prediction. Dead schema already anticipates it. |
| 13 | **Avastha / Graha Yuddha / Vimsopaka** | Medium | M | Completes the strength story started by #2. |
| 14 | **KP sub-lord layer** | Medium | L | Strong differentiator; only after #2 and #5. |

**If only three things get done: #2, #4, #5.** Strength-gating fixes what predictions *say*, model tiering fixes how well they *reason*, and the outcome loop is the only way to know either worked.

---

## One framing note

Research on this market is blunt about where perceived accuracy comes from: *"the accuracy users feel comes less from the math and more from how well the app interprets the specific chart instead of falling back on generic answers."*

Our math is already good. What reads as generic is narration that can't distinguish a strong yoga from a weak one, a combust planet from a bright one, or a birth-certificate time from a guess. **Every item in the top 4 above is a specificity fix, not a precision fix** — and they are all small, because the engine already computes what we're failing to say.

---

## Sources

- [Swiss Ephemeris — ephemeris files & flags](https://www.astro.com/swisseph/swepha_e.htm)
- [Rahu True Node vs Mean Node — the 1.29° difference](https://vedintelastroapi.com/blog/rahu-true-node-vs-mean-node)
- [Calculation methods for nodes in Vedic astrology](https://note.com/1nyo/n/nc8346cae7144?hl=en)
- [True Chitrapaksha vs official Lahiri ayanamsha](https://www.apa-software.com/True%20Chitrapaksha%20Lahiri%20Ayanamsha.html)
- [Ayanamsa explained for developers — Lahiri vs Raman vs KP](https://roxyapi.com/blogs/ayanamsa-lahiri-raman-kp-developers)
- [Bhava Chalit vs Rashi chart: when to use each](https://jagannathhora.com/bhava-chalit-vs-rashi-chart-explained/)
- [Bhav Chalit chart and prediction accuracy](https://astronidan.com/blog/accurate-astrology-predictions-and-role-of-bhav-chart/)
- [Vimshottari Mahadasha calculation, step by step](https://jagannathhora.com/vimshottari-mahadasha-calculation-step-by-step/)
- [Vimshottari dasha calculation: a developer guide](https://roxyapi.com/blogs/vimshottari-dasha-calculation-developers)
- [Birth time rectification — DIY guide (Jagannatha Hora)](https://jagannathhora.com/is-your-birth-time-correct-the-complete-diy-rectification-btr-guide-for-jagannatha-hora/)
- [Birth time rectification using Pranapada Lagna](https://vedangajyotish.wordpress.com/2011/08/17/birth-time-rectification-using-pranapada-lagna/)
- [KP sub-lord theory: the core concept that makes KP work](https://paramarsh.app/patrika/kp-astrology/kp-sublord-theory)
- [KP astrology for beginners — timing events](https://jagannathhora.com/kp-astrology-for-beginners/)
- [Mitigating LLM hallucinations through domain-grounded tiered retrieval (arXiv)](https://arxiv.org/html/2603.17872v1)
- [Preventing LLM hallucinations: best practices 2026](https://keymakr.com/blog/preventing-llm-hallucinations-techniques-best-practices-2026/)
- [Grounding LLM outputs with structured real-time data](https://apiclaw.io/en/blog/grounding-llm-outputs-with-structured-real-time-data)
- [LLM-as-a-judge: a complete guide to using LLMs for evaluations](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
- [Rubric-based evals & LLM-as-a-judge in domain context](https://medium.com/@adnanmasood/rubric-based-evals-llm-as-a-judge-methodologies-and-empirical-validation-in-domain-context-71936b989e80)
- [Is AstroSage AI accurate & safe? — 2026 review](https://omai.app/blog/omai-vs-astrosage-astrology-app.html)
- [Best AI astrology apps 2026 — comparison](https://astronidan.com/blog/10-best-ai-astrology-apps-websites-2026-free-paid-comparison/)
