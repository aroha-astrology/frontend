# Varshik Rashifal 2027: final plan (owner spec + review fixes)

## Context

We are building a paid, personal annual report, "Varshik Rashifal 2027". It is computed from the reader's birth date, exact birth time and birth place (lat, lng, tz).

Readers pay for timing they can act on, built on real Tajika maths:
- a 0–100 score
- a one-page 7×12 Timing Map
- a 365-day momentum wave
- 12 one-page month briefs
- plain words

The report runs to **51 pages** (owner's choice). The extra space goes into a two-page spread for each month, a page for each life area, and chapter art. None of it is repeated template text. The owner's research spec (2026-11-06) is the base. This file is that spec with the review corrections applied. Each correction is marked **[fix]**.

**Owner decisions:**
- The report covers Jan 1 – Dec 31 2027. The 2026 Varsha chart rules until the 2027 solar-return instant; the 2027 chart rules after it.
- The price is **₹599** (`59900` paise). The card shows a struck-through "real price" of **₹5,999** (`599900` paise, `defaultOriginalPricePaise`). Pass discounts of 10/20/30% apply on top of ₹599.
- It ships OFF, tagged `new`.
- It needs a confirmed birth time and coordinates, or the purchase is blocked.
- It comes as a designed screen, a PDF and share cards. No video.

**Lagna first.** Every house, score and Saham is read from the natal Lagna, the 2026 and 2027 Varsha Lagnas and Muntha. There are no Moon-sign templates. **[fix]** There is one stated exception: Sade Sati and Dhaiya are reported as facts counted from the natal Moon. This is the owner's standing rule. They appear on page 7 and feed the score, but they never decide house meanings.

## Reuse (do not rewrite)
- **`backend/src/lib/astro-engine/varshphal/`:**
  - `computeVarshphal`
  - `findSolarReturnJd` and `computeSolarReturn`. `isDayReturn` already uses real sunrise and sunset at the birth place.
  - `computeMuntha` and `selectVarsheshwara`
  - `tajika.ts`: Hadda, `panchavargiBala`, `tajikaRelation`, `tajikaAspectKala`
  - `sahams.ts`
- **Engine:** `swisseph-wasm` (`planetPositions.ts`), `dashas/`, `calculateSarvaAshtakavarga` and `calculateBhinnaAshtakavarga`, `detectCurrentSadeSati`.
- **Report template:** `kp_annual`, using these files:
  - `generators/kp-annual.generator.ts`
  - `lib/astro-engine/reports/kp-annual.ts`
  - `lib/llm/reports/kp-annual.ts`
  - `verify-claims.ts`
  - `report-facts-message.ts`
  - the checklist in `frontend/docs/monthly-yearly-kp-reports-end-to-end.md` §9
- **Frontend:**
  - `designed-screens.tsx`
  - `report-chart-geometry.ts` and `chart-palette.ts`
  - the existing North-Indian chart SVG
  - `lib/pdf/*` (DOM capture via `modern-screenshot`, A4 slicing)
  - `ReportGeneratingSheet.tsx` and `report-questions.ts`
  - `YEARLY_REPORT_KEYS`
  - the birth-time confidence data behind `BirthTimeConfidenceCard`, which the purchase guard uses

## Maths specification

### Solar return and Mudda dasha (`calendar-year.ts`, `mudda-dasha.ts`)
- **Solar returns.** Use the existing `findSolarReturnJd`. Tighten its tolerance to <1e-6° if needed. Pin the settings that must match the JHora oracle: Lahiri ayanamsa, true or mean node, and the house system.
- **Year length.** Each Varsha year lasts from one solar return to the next. Mudda periods are scaled to that exact span, not to a constant. (A sidereal year is about 365.256 days, not 365.2422.)
- **[fix] Starting lord.** The classical Mudda Vimshottari starting lord comes from (birth-nakshatra number + completed years − 2) mod 9. It does not come from the Varsha Moon, and both earlier drafts had this wrong. The balance rule must be checked the same way. **Match JHora's Mudda dasa output; that decides any doubt.**
- **Seam.** The 2026 Mudda list must end on the same number that starts 2027. Both come from the one `solarReturnMs` value, so the check is exact equality.

### Sahams (`sahams.ts`, `saham-windows.ts`)
- **[fix] Current code.** Today the +30° rule applies only to Vivaha, and only Punya reverses at night. Extending both rules to every Saham, as Neelakanthi does, changes the numbers chat already gives. That is right under the fix-once rule, but it has to be a deliberate change, checked against JHora, with the chat tests updated.
- **New Sahams.** Add Karyasiddhi, Pardesh and Putra.
- **[fix] Citations.** Code comments cite only a real source (book, edition, page or verse) that someone has checked. No verse numbers from memory. If a source can't be found, comment "matches JHora vX output".
- **[fix] Activation strength.** Integrate proximity over time while the planet is inside the orb. Do **not** also divide by speed. Time spent in the orb already rewards slow planets, stations and retrograde triple passes, so dividing again double-counts them.
  - The Saham-lord bonus (configurable, starting at 1.35×) applies when the transiting planet is the Saham lord.
  - The "Ithasala with the Saham lord" bonus is defined as an applying Tajika aspect between the transiting planet and the Saham lord's transit position, within Tajika orbs. It stays OFF until it has been checked against examples.
- **Which planets trigger.** Transiting Sun, Mars, Mercury, Venus, the Year Lord and the Muntha lord.

### Scoring (`reports/varshik-2027.ts`, `config/varshik-weights.ts`)
- **Inputs:**
  1. The Varsha chart in force: houses from the Varsha Lagna, Panchavargi strength of each house lord, Muntha house and lord, and the Year Lord's strength and aspects.
  2. The running Mudda dasha and sub-dasha lords.
  3. Transits by house from the natal and Varsha Lagnas, exact aspects, and SAV/BAV bindus.
  4. The natal Maha, Antar and Pratyantar dasha.
  5. **[fix]** Sade Sati and Dhaiya, as one damper.
- **Combination.** Inputs are combined in log-odds, with veto dampers (for example a Year Lord with Panchavargi below 5 and Radda, or Muntha in the 6th, 8th or 12th under a malefic Ithasala) and dominance boosts (Kamboola, strong Saham windows). Every constant lives in the weights config.
- **[fix] Tajika yogas.** Only aspects and relations exist today. Ithasala, Ishrafa, Nakta, Yamaya, Kamboola and Radda are new code. They go into Sprint 1 as `tajika-yogas.ts`, each checked against JHora's yoga list on the benchmark charts.
- **Tiers.** Dark Green ≥75, Light Green 60–74, Amber 45–59, Rust below 45.
- **Momentum series.** 365 daily points, smoothed with Savitzky–Golay. A 5-day cross-fade at the 2027 solar return keeps the birthday from showing as a cliff. **[fix]** The month grid must agree with the wave: a birthday month's score is the day-weighted mean of the smoothed daily series, so the two can't disagree.
- **Persona.** `decisionTable` is weighted by the pre-purchase answers (relationship status, work or study, children, main 2027 decision).

## Pages (51; PDF and in-app follow the same order)

Assets are numbered A1–A48 in the "Assets" section below.

**Front (3)**
| # | Page | Visual / asset |
|---|---|---|
| 1 | Cover. The title, "2027" and the name are live text, so they can be translated and reused for 2028. | A1 cover art (no text) |
| 2 | Welcome and how to read: the 4 colour tiers, and checking the report on the 1st of each month | Legend swatches, A47 ornament |
| 3 | Contents | Chapter list with A2–A6 thumbnails |

**Chapter I: The shape of your year (9)** *(C3 added pages 6a and 8a; the numbers below are the original ones, so the new pages carry an "a")*
| # | Page | Visual / asset |
|---|---|---|
| 4 | Chapter opener | A2 |
| 5 | 2027 at a glance: overall score, Year Lord, Muntha house, the year's theme, 3 peak months and 1 rest month | `ScoreRing`, badges using A8–A16 |
| 6 | Birth chart: date, time, place, Lagna, longitudes, dasha balance | North-Indian SVG |
| 6a | **Your birth stars** *(C3)*. A 10-row table (9 planets and the Lagna): nakshatra, pada, star lord with its house, nature, deity and meaning in one plain line, its Tara from the birth star, and a "sensitive junction point" tag where a planet sits at a Gandanta. Below it, the stars of the lords that run in 2027 (Maha, Antar, Pratyantar, Mudda). Text: `birth_stars`, 4 paragraphs. | `StarPages.tsx` `BirthStarsBody` |
| 7 | The two Varsha charts: 2026 and 2027 solar-return times and their Lagnas | `VarshaTimeline` |
| 8 | Year Lord and Muntha | `PanchadhikariTable`, Muntha wheel, Year Lord medallion (A8–A16) |
| 8a | **The year's three flags** *(C3)*. For each Varsha chart, the Tri-Pataki flags in plain words (who pierces the Lagna and who pierces the Moon, after Mehta; no combined score), then Mudda, Mudda Yogini and Patyayini side by side. Patyayini is shown by the week only ("2nd week of March"), never as an exact day. Text: `three_flags`, 3 paragraphs. | `StarPages.tsx` `ThreeFlagsBody` |
| 9 | Big sky moves: Saturn, Jupiter, Rahu–Ketu by house and bindus, plus Sade Sati / Dhaiya from the natal Moon | `BigMovesGantt` |
| 10 | Planet by planet: all 9 planets | `PlanetImpactTable` with A8–A16 |
| 11 | **Doshas in your 2027.** Every dosha the engine checks: Mangal, Kaal Sarp, Pitra, Guru Chandal, Grahan, Kemadruma, Sade Sati, Dhaiya and, since C3, Gandanta (the 9th, described as "a sensitive junction point"). Each gets its status (present / cancelled, with the reason / not present), the months of 2027 it is active (by dasha, Mudda dasha and transits), what it touches, and the simple remedy. Calm wording. | `DoshaTable` with month dots |
| 12 | **Yogas on your side.** The natal yogas from `detectAllYogas`, plus the Tajika yogas of each Varsha chart (Ithasala, Kamboola and the rest), and the months they deliver | `YogaList` with month dots |

**Chapter II: Seven areas of life (9)**
| # | Page | Visual / asset |
|---|---|---|
| 13 | Chapter opener | A3 |
| 14 | Seven areas overview, each scored out of 100 | `AreaBars` with A17–A23 icons |
| 15–21 | One page per area (Love, Career, Money, Health, Family, Growth, Travel): score, a 12-month line for the area, its houses and Saham, best and hold months, what it means for the reader's situation | A17–A23 header, `AreaMonthLine` |

**Chapter III: Your timing (7)** *(C3 added page 25a)*
| # | Page | Visual / asset |
|---|---|---|
| 22 | Chapter opener | A4 |
| 23 | Master Timing Map, 7×12 | `TimingMap` |
| 24 | Year's rhythm: daily wave, Mudda bar, Saham pins | `MomentumWave` |
| 25 | **Sky calendar 2027.** Every sign change, retrograde and direct station, and combustion of all planets, plus the 2027 solar and lunar eclipses with the house of your chart each falls in. Since C3 it also lists, by month, each time Saturn, Jupiter, Rahu, Ketu or Mars enters a new star (a sensitive star marked) and the Moorti of each sign change. | `SkyCalendar` (12-month strip with event marks) |
| 25a | **Your stars in 2027** *(C3)*. A Navatara wheel of the 27 stars counted from the reader's birth star (friendly stars filled, sensitive stars marked), the slow planets' crossings with dates and what each star means for the reader, and the Moorti of each sign change. Text: `your_stars_2027`, 4 paragraphs. | `StarPages.tsx` `YourStarsBody` |
| 26 | When to act, by persona | `DecisionTable` |
| 27 | Golden windows and key dates | Calendar strip |

**Chapter IV: Month by month (25)**
| # | Page | Visual / asset |
|---|---|---|
| 28 | Chapter opener | A5 |
| 29–52 | Two pages per month (Jan–Dec). **Page A, "The month at a glance":** a month banner, the score ring, 7 mini bars, the Varsha chart in force, the Mudda lord and its dates, a key-dates calendar (ingresses, stations, Saham peaks, that month's festivals from our festival table and, since C3, the month's star changes of the slow planets and the Moorti of sign changes). **Page B, "Living the month":** what to do and what to hold; notes on career and money and on love and health, written for the reader's own answers; one dated remedy. | A24–A35 banner on page A, A47 ornament on page B |

**Chapter V: Carrying it with you (2)**
| # | Page | Visual / asset |
|---|---|---|
| 53 | Simple remedies (at most 3) | A6, A40–A45 icons |
| 54 | Your year on one card, with the 12 month cards shown small. **[fix]** The cards carry no birth time, place, coordinates or personal facts, because they get shared on WhatsApp. The full-size cards are saved from the app. | A36 card background |

**Chapter VI: Your questions, answered (2–7 pages, always last)**
| # | Page | Visual / asset |
|---|---|---|
| 55 … 54+N | **Up to 5 questions, one page each (N = 0–5).** Each is a question the reader is really facing, picked from their own facts and answers. Each page has three parts: **what you are going through** (named gently and specifically, without repeating their private words back too bluntly), **when it eases** (a dated window from the engine, with its tier colour) and **what helps meanwhile** (one or two practical steps). | A52 banner, a small window chip |
| next | **What you've been through, and what changes.** The hard stretch of the recent past (about the last 18 months), read from the chart: dasha changes, Saturn or Rahu–Ketu over key houses, Sade Sati / Dhaiya, the 2026 Varsha year. Then the dated turning points that bring relief. If no real relief arrives in 2027, the page says so gently and names the next turning point (up to 2029) and what makes the wait easier. | A53 banner, a "then → turning point → relief" timeline |
| last | **Closing letter from Baba Ji**, signed with the seal | A6, A49, A51, signature |

**Page count.** 57 core pages (the original 54 and the three C3 pages) + N question pages + the relief page + the closing letter = **59 to 64 pages**. In short: **59 + N**.
- Without any facts or answers: **N = 0**, and the report is 59 pages. The relief page is read from the chart alone, so it is always there.

## Completeness contract (no gaps, no guesses)

**1. One facts object, fully checked before any text is written.** `VarshikFacts` (a zod schema in the backend) must contain every item below. The preflight step validates it. If any field is missing, NaN or out of range, generation stops. The existing refund flow returns the reader's money, and the admin log records which field failed. The report never ships with a gap, a placeholder or a model-guessed value.

| Group | Must contain |
|---|---|
| Birth chart | Lagna and all 9 planets: sign, degree, nakshatra and pada, retrograde, combust, dignity. Houses, D9 and D10. Shadbala. |
| Dashas | Vimshottari Maha, Antar and Pratyantar for 2026–2029 (Pratyantar for 2027). The natal balance. |
| Ashtakavarga | BAV for the 7 planets, SAV, and kakshya for each transit. |
| Doshas, all 9 | Mangal, Kaal Sarp, Pitra, Guru Chandal, Grahan, Kemadruma, Sade Sati, Dhaiya, Gandanta: status, cancellation reasons, active months in 2027 (`doshaActivity`) |
| Yogas | Every natal yoga from `detectAllYogas`, with its delivering dasha and months. Every Tajika yoga in both Varsha charts. |
| Varsha years | Both solar returns (exact time), Varsha Lagnas, Muntha and its lord, Panchadhikari with the Year Lord, Panchavargi for all 7 planets, the 8 Sahams, Saham windows, and the full Mudda dasha for both years with no seam |
| Sky events 2027 | All ingresses, retro and direct stations, combustion in and out, and the solar and lunar eclipses with their natal and Varsha houses (`year-events.ts`) |
| Scores | 12 months × 7 areas, the overall score, the 365-day series, the decision table, planet impact, `answerWindow` for each used key, and `reliefTimeline` |
| Calendar | 2027 festivals and key Panchang dates from the existing festival table |
| Reader | Confirmed birth time and coordinates, the 4 answers, and the profile's facts. Facts may be empty; that is the only group allowed to be. |

**2. Every section is covered.** After the text is written, a coverage check confirms that every page in the plan has its data and its text:
- 12 months, both pages each
- 7 areas
- all 9 doshas
- the three C3 pages (the birth star and the dasha lords named, the Tri-Pataki flags and the three dashas, every slow-planet star move dated), and every Saturn, Jupiter, Rahu and Ketu star move dated in its month page
- all yogas
- every sky event in the calendar

A dosha that isn't present still gets its short "not in your chart" line, so the reader sees it was checked. Anything missing gets regenerated once. If it is still missing, the whole run fails and the reader is refunded.

**3. Every claim matches the facts.** The existing `verify-claims` check is extended: every planet, house, sign, date, dasha and score named in the text must exist in `VarshikFacts`. Any mismatch fails the section.

**4. Accuracy is checked against outside references:**
- Varsha charts, Sahams, Mudda dasha and Tajika yogas against the JHora fixtures (S1).
- Eclipse times against the NASA eclipse catalogue.
- Ingress, station and combustion dates against drikpanchang 2027, to within the minute shown there.
- Doshas against the existing dosha tests. Any shared engine bug found here is fixed in the shared module, for every report (fix-once).

**Where the questions come from.** Only the reader's own facts:
- the stored chat facts for this birth profile (`getUserFacts(userId, birthProfileId)` in `backend/src/modules/astro/user-facts.repo.ts`)
- the four pre-purchase answers, especially "the big decision you face in 2027"

Facts are read when the report is generated. A refresh re-reads them.

**Choosing the questions.**
- An LLM step proposes up to 5 questions. Each one names the fact ids it came from, and links to one of the engine's area or decision keys.
- Anything that can't be linked to a fact, or to a key, is dropped. That keeps invented worries out. Duplicates are dropped too.
- Death, serious illness, accidents, legal cases and pregnancy loss are never chosen as questions.

**Answers.** The timing ("when it eases") always comes from the engine's computed windows for that key (S2 `answerWindow`), never from the text model.

**Tone in this chapter** is extra gentle. No negative statements, except something the reader genuinely needs to know, and that is said kindly together with what helps. (The full report may discuss hard periods plainly, but never death.)

## Premium standard (owner: "everything premium level")

**Owner choices (2026-11-06):**
- The report is signed by **Baba Ji**.
- **Digital only**: no print bleed.
- **Classic serif** typography.
- The owner sends the **Aroha gold logo**.

**Typography**
- Fonts, all free:
  - **Headings:** Cormorant Garamond.
  - **Body:** Inter.
  - **Indic:** Noto Serif Devanagari, Tamil, Bengali, Telugu, Kannada, Gujarati and Gurmukhi.
  - **Baba Ji's signature:** the handwriting font already behind `nav.reportBookHandwriting`.
- The fonts are self-hosted and subset to the glyphs we use, so the PDF never shows a fallback font.
- One type scale for the whole report, used everywhere: H1 44, H2 28, H3 20, body 15/1.6, caption 12.
- Small-caps eyebrow labels and old-style numerals for the scores.
- A drop cap on each chapter's first paragraph (Latin scripts only).

**Page craft**
- A 12-column grid with 18 mm margins.
- Running header: chapter name, plus "Prepared for [Name]". Footer: page number in gold, and the small Aroha logo.
- Gold appears only on rules, numerals, ornaments and headings. It is a foil-texture gradient (A50), never flat yellow.
- Generous white space. At most one chart and one text block per page.
- An edition line on page 2: "Edition 2027 · No. [report number]", from the report id.

**Baba Ji's voice and signature**
- Page 2 is a welcome letter from Baba Ji: his portrait in a gold frame (the existing `/yogi-baba.webp`, upgraded to a high-res original if the owner has one), a short personal letter that names the reader and their Year Lord, and his signature with a gold wax seal (A49).
- Page 50's closing note is signed the same way.
- The rule against naming technology still holds: Baba Ji is a guide, not "an AI".

**In the app**
- **When the report is ready:** the A46 wheel finishes its turn, the cover fades in, and the reader's name writes itself onto the "Prepared for" line. On Android there is a light haptic tap.
- Score rings and bars fill once as they scroll into view. The Timing Map cells reveal month by month. All of this is skipped when the device asks for reduced motion.
- Pages move like a book: swipe between pages, with a chapter jump list.
- No empty or loading states show raw spinners; skeleton shapes match each page.

**Never shipped:** placeholder art, a fallback font in the PDF, a clipped Indic label, stretched or blurry images, or default chart colours.

**A design gate in every visual sprint (S4, S5, S6).** Each one ends with screenshots of every page it touched, in light and dark, at phone width and A4, shown to the owner before the sprint closes.

## Voice and tone (applies to every word the reader sees)

The owner's rule is that all copy goes through the **humanizer** (the repo-based skill; the rules follow Wikipedia's "Signs of AI writing"). Here it covers two layers:

1. **Fixed English copy.** Headings, legends, page intros, questions, buttons, the loading steps and the closing note are written once and run through the humanizer skill before they go into i18n.
2. **Generated report text.** Everything the 4 LLM calls write:
   - **The prompt itself carries the humanizer rules.** These are written as a style block in `lib/llm/reports/varshik-2027.ts`:
     - none of the AI tells: "not X but Y" contrasts, groups of three, one-line closers, staged openers, dashes everywhere, inflated claims, sales language, stock words like "delve", "tapestry", "journey", "navigate", "embrace", "unlock"
     - no bold labels
     - short, plain sentences that say concrete things
   - **A cheap automatic check after generation.** It runs inside `verify-claims`, on the English text. It counts the banned words, dash density, "not… but" patterns and repeated sentence openings. A section that fails is regenerated once with the hits listed. If it fails again, it is flagged in the admin log. The same check can later be reused by every other report (the fix-once rule).
   - **Spot review.** In Sprint 7, three full test reports (single student, married professional, retired) go through the humanizer skill by hand. Any pattern it keeps catching goes back into the prompt rules.

**Tone the reader should feel.** Like a calm, kind family astrologer who respects them.
- Warm and steady. Speaks to "you". Gives practical advice tied to real dates.
- **Rust months** are framed as rest, patience and preparation, never as danger. No fear words ("tabahi", "disaster", "anhoni", "curse").
- **No certainties.** Nothing like "you will get married in March". Say "March is your strongest window for this".
- **Sensitive topics.**
  - No predictions of death, accidents, serious illness, divorce or pregnancy loss. This matches the chat safety rules already live.
  - Health text talks about rest, routine and checkups, never diagnoses.
  - Money text never names stocks or amounts and never promises returns.
- **Respects the reader's answers.** No partner, child or job is assumed beyond what they told us (the persona check in Sprint 3).
- **Remedies** are simple and free or cheap: no paid pujas, gemstone sales or fear-based "must do". The report doesn't push products.
- **No technology names.** No AI, no model or provider names, no "generated". The text doesn't mention the app's own machinery (the owner's rule).
- **Sanskrit terms** (Muntha, Varsha, Mudda, Saham) appear once with a plain gloss, and plain words after that.
- **Translations** keep this tone. The translation prompt carries a short tone note: respectful "aap" in Hindi, and the matching polite forms in other languages.

## Assets (owner generates; 48 images)

**Rules for every image:**
- **No text, letters, numbers or logos.** We add all words as live text so they can be translated.
- No watermark.
- Keep to one look. Start each prompt with the style line below.
- Icons and medallions: ask for a plain flat #0B0B2A background. We cut the background out ourselves (`remove-background`), so no transparency is needed from the generator.
- Send the full-size images. We convert them to WebP. Name each file by its code (e.g. `A24-january.png`) and drop them into one folder; I'll tell you the folder at Sprint 5.

**Style line (paste at the start of every prompt):**
> Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail, no text, no letters, no numbers, no logo, no watermark.

### Cover and chapters (6)
| Code | Size | Prompt (after the style line) |
|---|---|---|
| A1 cover | 2480×3508 portrait | A large ornate golden zodiac wheel floating in the centre, twelve fine segments with tiny constellation dots in place of symbols, an eight-pointed star at its heart glowing with an iridescent pearl light, a thin golden orbit ring sweeping diagonally around it with small glowing planets on it, empty dark sky in the top third for a title and an empty band at the bottom for a name, symmetric and centred. |
| A2 Ch I "The shape of your year" | 2480×3508 | A golden sun completing a full circular orbit around a softly glowing birth chart drawn as a fine square diamond grid, a bright point where the orbit closes, sense of a new year beginning, empty sky at top for a heading. |
| A3 Ch II "Seven areas of life" | 2480×3508 | Seven glowing gold-rimmed orbs arranged in a gentle rising arc over a calm reflective lake at night, each orb a slightly different soft colour (rose, gold, emerald, pearl, amber, violet, sky blue), empty sky at top. |
| A4 Ch III "Your timing" | 2480×3508 | An antique brass astrolabe and an Indian sundial (Samrat Yantra style) under the stars, a luminous golden wave of light flowing across the scene from left to right like a gentle tide, empty sky at top. |
| A5 Ch IV "Month by month" | 2480×3508 | Twelve lotus petals arranged in a perfect circle like a calendar ring, a different moon phase glowing above each petal, a single diya flame in the centre, empty sky at top. |
| A6 Closing "Carrying it with you" | 2480×1400 landscape | A quiet dawn horizon with the first golden sunrise light, a single lit clay diya on a stone ledge in the foreground, stars fading in the violet upper sky. |

### Year Lord and planet medallions (9)
1024×1024 each. Prompt pattern: *"A round medallion with an ornate thin gold rim, centred on a plain flat #0B0B2A background, inside it [X], simple and iconic, readable at small sizes."*

| Code | [X] |
|---|---|
| A8 Sun (Surya) | a radiant golden sun disc with soft rays |
| A9 Moon (Chandra) | a pearl-white crescent moon with a gentle silver glow |
| A10 Mars (Mangal) | a deep coral-red glowing orb with a small golden trident-like spark above it |
| A11 Mercury (Budh) | an emerald-green orb with a delicate leaf-shaped light |
| A12 Jupiter (Guru) | a warm saffron-yellow orb with soft banded glow |
| A13 Venus (Shukra) | a brilliant diamond-white orb with a faint rose sheen |
| A14 Saturn (Shani) | a deep sapphire-blue planet with a thin golden ring |
| A15 Rahu | a smoky violet shadow orb with a stylised serpent head silhouette curling at its edge |
| A16 Ketu | a smoky amber shadow orb with a stylised serpent tail silhouette and a small flag-like flame |

### Seven life areas (7)
1600×1000 landscape, used as the area-page header and cropped for icons.

| Code | Area | Prompt (after the style line) |
|---|---|---|
| A17 | Love | Two swans facing each other on a moonlit lotus pond, their necks forming a soft heart shape, rose-gold reflections. |
| A18 | Career | A gently glowing stone staircase rising toward a bright star, each step edged in gold light. |
| A19 | Money | An ornate brass kalash pot overflowing with soft golden light and a few coins, a lotus at its base. |
| A20 | Health | A single open lotus floating on still water, a calm circle of breath-like light rising from it. |
| A21 | Family | A great banyan tree with a small lit home beneath its branches, warm windows, stars through the leaves. |
| A22 | Growth | An open ancient book with a small diya beside it, a young sapling growing from the pages toward the stars. |
| A23 | Travel | A softly glowing path of light crossing a starry map-like sky, a small paper boat sailing on it toward a distant horizon. |

### Twelve month banners (12)
2400×800 wide banner. Keep the centre calm (text sits over it).

| Code | Month | Prompt (after the style line) |
|---|---|---|
| A24 | January | Colourful kites rising into a clear winter dawn sky over rooftops, sesame and jaggery sweets on a brass plate in a corner. |
| A25 | February | Endless yellow mustard fields under an early spring night sky, a crescent moon. |
| A26 | March | Soft clouds of pink, saffron and green colour powder drifting in the air, palash flowers, festive and gentle. |
| A27 | April | Golden wheat sheaves and mango leaves strung on a doorway, a new-year harvest feel under evening stars. |
| A28 | May | A blazing summer sun setting over a still lotus pond, warm amber light. |
| A29 | June | The first dark monsoon clouds rolling in with silver rain edges, parched earth smelling of rain. |
| A30 | July | Rain drops falling on a dancing peacock's spread feathers in a lush green garden at dusk. |
| A31 | August | A decorated wooden swing (jhoola) hung from a tree in a green monsoon garden, flowers and fine silk threads. |
| A32 | September | A full moon rising over a calm river with a few floating lotus flowers and distant temple silhouettes. |
| A33 | October | Strings of orange marigold garlands and rows of glowing diyas, festive night sky with soft fireworks far away. |
| A34 | November | Hundreds of small lamps floating on a river at river-side ghats under a star-filled Kartik night. |
| A35 | December | A misty winter night over Himalayan peaks, a clear starry sky, a warm small light in a mountain hut. |

### Cards, backgrounds and small icons (14)
| Code | Size | Prompt (after the style line) |
|---|---|---|
| A36 share-card background | 1080×1920 portrait | A softly glowing small zodiac wheel at the top, the rest of the space a calm gradient night sky with sparse stars, plenty of empty space for text. |
| A37 page background (dark) | 2480×3508 | A very subtle, low-contrast night-sky texture with faint scattered stars and a thin ornate gold border near the edges, mostly empty, suitable behind text. |
| A38 page background (light) | 2480×3508 | Warm ivory handmade paper texture with a thin ornate gold border and very faint gold star dust in the corners, mostly empty, suitable behind dark text. (Drop the navy part of the style line for this one.) |
| A39 catalogue card | 1200×800 | A smaller version of the cover scene: golden zodiac wheel with an orbit ring and glowing planets, centred, empty space on the left for a title. |
| A40–A45 remedy icons | 1024×1024 each, medallion pattern as above | A40: a lit clay diya. A41: a string of rudraksha prayer beads. A42: hands offering grain to birds. A43: a copper pot pouring water toward a rising sun. A44: a peepal leaf. A45: a small open palm holding a lotus flower. |
| A46 loading wheel | 1500×1500 | Only the ornate golden zodiac wheel from the cover, perfectly centred and flat-on, on a plain flat #0B0B2A background, nothing else. |
| A47 ornament | 2000×300 | A thin symmetrical gold filigree divider with a small lotus in the centre, on a plain flat #0B0B2A background. |
| A48 back cover (optional, not counted in the 51) | 2480×3508 | The same night sky as the cover, with only a small glowing star in the centre and lots of empty space. |
| A49 wax seal | 1024×1024, plain flat #0B0B2A background | A round antique gold wax seal pressed with an empty circular centre (we place the Aroha logo inside), fine embossed lotus petals around the rim, soft realistic shine. |
| A50 gold foil texture | 2048×2048 | A seamless, tileable brushed gold foil texture with subtle warm highlights and fine grain, no pattern edges. (Drop the navy part of the style line.) |
| A52 "Your questions" banner | 2400×800 | A single brass lantern glowing on a stone path at night, lighting the way ahead into soft mist, warm and reassuring. |
| A53 "What changes" banner | 2400×800 | A misty forest path opening into a sunlit clearing at dawn, the light growing stronger toward the right side. |
| A51 portrait frame | 1200×1500, plain flat #0B0B2A background | An ornate oval gold frame with lotus and vine filigree, an empty dark centre for a portrait. |

**Also from the owner (not generated):**
- The Aroha logo in gold, as SVG or high-res PNG.
- A high-res original of Baba Ji's portrait, if one exists (the app's `/yogi-baba.webp` is small).

**Asset gate (updated 2026-11-06, owner decision).** No sprint waits for images. Every asset (A1–A53, the Aroha gold logo, Baba Ji's portrait) is added at the END of the build, after the last sprint. S4, S5 and S6 use placeholder boxes behind the `assets.ts` map, so dropping in the real files later changes no layout. The S5 and S6 design gates are shown with placeholders; one final asset pass then swaps in the images, converts them to WebP and re-checks every page, light and dark, phone width and A4.

## Sprints (one new chat each)

### S1: Engine (backend)
- New files:
  - `mudda-dasha.ts`
  - `calendar-year.ts` (`computeCalendarYearVarshphal(ctx, 2027)`, clipped to the reader's timezone)
  - `saham-windows.ts`
  - `tajika-yogas.ts`
- Expand `sahams.ts`, behind a deliberate rule change, and update the chat varshphal tests to match.
- New `year-events.ts`: all 2027 ingresses, stations, combustion in and out, and eclipses, from swisseph (or the engine's own geometry if the wasm build lacks the eclipse functions). Checked against NASA and drikpanchang.
- **Benchmark charts.** Before coding, the owner (or Claude, if the owner exports them) records JHora output for 10 charts: 5 day returns and 5 night returns, including birthdays on Jan 2 and Dec 29. Recorded per chart: solar-return time, Varsha Lagna, Sahams, Year Lord, Panchavargi, Mudda dasa and Tajika yogas. These are saved as fixtures.
- **Delegation.** Test suites and long boilerplate go to local-coder. The Mudda start-lord and Saham formulas are written by Claude, because the maths has to be exact.

### S2: Scoring (backend)
- `reports/varshik-2027.ts`: `computeVarshikScores(ctx, answers)`, `momentumSeries`, `decisionTable`, `planetImpact`.
- `config/varshik-weights.ts` holds all the constants.
- **Dosha and yoga timing.** `doshaActivity(ctx, month)` gives, for all 9 doshas, whether each is active that month and why (dasha, Mudda dasha or transit trigger). `yogaDelivery(ctx)` gives the months each natal and Tajika yoga delivers.
- **Two more pure functions, for Chapter VI:**
  - `answerWindow(key)`: the best dated window for an area or decision key, with its tier, and the next window if this year's is weak.
  - `reliefTimeline(ctx)`: the recent hard stretch (about the last 18 months: dasha and antardasha changes, Saturn or Rahu–Ketu over key houses, Sade Sati / Dhaiya phases, the 2026 Varsha) and the dated turning points ahead, looking up to 2029.
- **Calibration.** Run over 100 stratified synthetic charts.
- **[fix]** The spread targets apply to the population, not each profile:
  - The cell mix should land at roughly 15% Dark Green, 40% Light Green, 30% Amber and 15% Rust (±5%).
  - Fewer than 5% of profiles may have all 12 months in one tier.
  - The median month range should be at least 22.

  A rule that every profile must range ≥22 would force a fake spread onto quiet years. Instead, any profile under 10 points of range is logged and inspected.

### S3: Report wrapper and text (backend)
- **Registration.**
  - `config/reports.ts`: `varshik_rashifal_2027`, with `isYearly`, `basePricePaise: 59900` and no partner. In `config/features.ts`: `defaultPricePaise: 59900`, `defaultOriginalPricePaise: 599900`.
  - `config/features.ts`: `defaultEnabled: false`, tag `new`.
  - `report-sections.ts`
- **Price set from admin (owner request 2026-11-06).** The existing Admin → Features page already edits both price and original (struck) price for every entry in the feature registry. Registering the key, in group `reports`, is what makes it appear there.
  - Confirm the purchase charges the admin price (`resolved.pricePaise`) and never the hard-coded `basePricePaise`.
  - Confirm a price change takes effect on the next purchase without a deploy.
  - Confirm Pass discounts apply on top of the admin price.
  - If country pricing (`money.countryPricing`) is switched on, check the report follows the country tiers like the other reports.
  - Add a backend test: admin sets ₹399, and the purchase is charged ₹399.
- **Fixed window.** In `findActiveYearlyReportRow`, this key always expires on Dec 31 2027. **[fix]** It is on sale now through 2027. A buyer in mid-2027 still gets all 12 months, and the catalogue card says which months have already passed.
- **Completeness contract.** Implement it in full: the `VarshikFacts` zod schema, the preflight that stops generation and refunds, the coverage check after the text is written, and `verify-claims` against `VarshikFacts`.
- **Purchase guard.** Birth time and coordinates must be confirmed. The four pre-purchase questions go in `report-questions.ts`.
- **Generator.** `generators/varshik-2027.generator.ts`, plus 5 checkpointed LLM calls in `lib/llm/reports/varshik-2027.ts`:
  1. theme, Year Lord and Muntha
  2. planets and big moves
  3. months 1–6
  4. months 7–12
  5. **Chapter VI**
- **Chapter VI step.**
  - The generator reads `getUserFacts` for the report's birth profile, plus the four answers.
  - The LLM proposes questions, each tied to fact ids and a key. Code drops any question without both, and any banned topic, then keeps at most 5.
  - The answers get their windows from `answerWindow`, and the relief page gets its dates from `reliefTimeline`.
  - If there are no facts and no answers, the questions are skipped and only the relief page and closing letter are written.
  - The text check adds a "gentle chapter" rule: no fear words and no flat negatives in Chapter VI.
- **Prompt input.** Tier tokens (`TIER_GO`, `TIER_STEADY`, `TIER_WEIGH`, `TIER_HOLD`) and `why[]` facts.
- **Checks in `verify-claims`.** Polarity: no "go" advice in a Rust cell. Persona: no partner or child talk when the reader said single or no children. **[fix]** These checks run on the English text, before translate-on-read. The translations come from checked English, so the checks don't need rebuilding in 15 languages.

### S4: SVG chart components (frontend)
- Nine components go in `components/reports/varshik/`:
  - `ScoreRing`
  - `AreaBars`
  - `TimingMap`
  - `MomentumWave`
  - `BigMovesGantt`
  - `VarshaTimeline`
  - `PanchadhikariTable`
  - `PlanetImpactTable`
  - `DecisionTable`
  - `DoshaTable`
  - `YogaList`
  - `SkyCalendar`
- Each has ≥35% room for longer Indic text and line-height 1.45, and works in light and dark.
- **Delegation.** Components of 80+ lines go to local-coder with a spec. Claude then reviews them with `tsc` and lint.

### S5: Designed screen and loading (frontend)
- `VarshikReportView.tsx`, registered in `designed-screens.tsx`, with the key added to `YEARLY_REPORT_KEYS`.
- Images: A1–A48 converted to WebP in `public/varshphal/` (backgrounds removed from the medallions, icons and the A46 wheel). An `assets.ts` map ties each code to its file. The catalogue card goes in `public/reports/varshik_rashifal_2027.png`.
- New components for the 51-page layout: chapter-opener page, area page (`AreaMonthLine`), month spread (page A and page B), contents page.
- Light and dark page themes, using A37 and A38.
- Month key dates also list that month's festivals, taken from the existing festival table (backend).
- In the generating sheet, for this key only: the A46 wheel turning slowly, with progress steps.

### S6: PDF and share cards (frontend)
- **[fix]** The PDF comes from DOM capture (`modern-screenshot`, sliced into A4 by `page-breaks.ts`), not from browser print, so `@media print` is not the tool here. Each of the 59 + N pages renders in its own fixed-size A4 page box.
- **File size.** Fifty-nine or more image pages can get heavy. Keep the art as WebP at most ~250 KB each, and tune the JPEG quality so the whole PDF stays under ~15 MB. Check on Android. If a page's text is too long, the font shrinks one step (to a floor). It never spills onto a new page. That is what keeps the count at 59 + N.
- File name: `Varshik-Rashifal-2027-<Name>.pdf`.
- Cards: rendered with `modern-screenshot`, and saved through Android FileSaver or the Web Share API.

### S7: Copy, languages, tests, release
- The humanizer pass. No AI or technology names, and no fear wording. The three C3 pages and the star lines in the month pages go through it too, and the words "Vadha" and "Vainashika" never appear: they read "a hard, draining star / stretch".
- Translate the C3 strings (`varshik.stars.*`, `varshik.flags.*`, `varshik.page.birthStars`, `varshik.page.flags`, `varshik.page.yourStars`, `varshik.month.starMove`, `varshik.month.starSensitive`, `varshik.month.moorti`, `varshik.sky.starKey`, `varshik.dosha.gandanta`): they are written in English with `defaultValue` fallbacks only until this step. The engine's plain star lines (tara and Moorti meanings, the nature and meaning of each star) are English facts like the dosha notes; decide in S7 whether to translate them through the same route.
- Translations through apinex `free/gemini-3.8-flash`, then `i18n:check`.
- Playwright tests plus the backend guard tests.
- Deploy the backend first, then the web. The switch stays OFF.

## Sprint start prompts and models

Each sprint runs in a new chat started from `frontend/`. Sprint 1 first copies this plan to `frontend/docs/varshik-rashifal-2027-plan.md` so later chats can read it.

| Sprint | Model | Why |
|---|---|---|
| S1 Engine | **Opus 5.5** | Exact Tajika maths, checked against JHora; mistakes are silent |
| S2 Scoring | **Opus 5.5** | Weight design and calibration judgement |
| S3 Wrapper and text | **Opus 5.5** | Prompt and tone design, the text checks, purchase-window logic |
| S4 Chart components | **Sonnet 5.5** (+ local-coder) | Well-specified SVG work |
| S5 Screen and assets | **Opus 5.5** (+ local-coder for big files) | The premium look is decided here. Typography, spacing and motion need design judgement. |
| S6 PDF and cards | **Sonnet 5.5** | Known pipeline. Switch to Opus if page-fitting gets stuck. |
| S7 Copy, i18n, tests, release | **Sonnet 5.5**, then a final review on **Opus 5.5** | Mostly mechanical. Opus does the last review before release. |

The start prompts are below. Paste one as the first message of each sprint's chat.

**S1**
```
Sprint 1 of Varshik Rashifal 2027. Read the plan at C:\Users\wookiee\.claude\plans\now-let-s-plan-about-toasty-bengio.md (copy it to frontend/docs/varshik-rashifal-2027-plan.md first) and do only "S1: Engine".
Backend: backend/src/lib/astro-engine/varshphal/. Reuse computeVarshphal, findSolarReturnJd, tajika.ts, sahams.ts — don't rewrite them.
Also build year-events.ts (2027 ingresses, stations, combustion, eclipses; check against NASA + drikpanchang).
Build mudda-dasha.ts (classical start lord: birth nakshatra + completed years − 2, mod 9; span = exact solar return to solar return), calendar-year.ts (computeCalendarYearVarshphal for Jan–Dec 2027, two Varsha years), saham-windows.ts (time-in-orb integral, no extra divide by speed), tajika-yogas.ts, and add Karyasiddhi, Pardesh, Putra Sahams.
Before coding, ask me for the 10 JHora benchmark charts. Store them as fixtures, and make all numbers match within the plan's tolerances. Never invent verse citations.
If extending the +30° and night rules to all Sahams changes chat output, update the chat varshphal tests too and tell me what changed.
Follow CLAUDE.md (local-coder for test suites and boilerplate of 80+ lines). Commit on a new branch feat/varshik-2027. Don't push.
```

**S2**
```
Sprint 2 of Varshik Rashifal 2027. Read frontend/docs/varshik-rashifal-2027-plan.md and do only "S2: Scoring".
Build backend/src/lib/astro-engine/reports/varshik-2027.ts (computeVarshikScores, momentumSeries, decisionTable, planetImpact, doshaActivity for all 9 doshas, yogaDelivery, answerWindow, reliefTimeline) and config/varshik-weights.ts, on top of the Sprint 1 engine.
Lagna-first, with Sade Sati/Dhaiya from the natal Moon as one damper. Combine in log-odds with veto and dominance gates. Tiers are 75/60/45. A birthday month is the day-weighted mean of the smoothed daily series.
Calibrate on 100 synthetic charts against the population targets (not per profile) and show me the tier mix and spread before locking the weights.
Branch feat/varshik-2027. Don't push.
```

**S3**
```
Sprint 3 of Varshik Rashifal 2027. Read frontend/docs/varshik-rashifal-2027-plan.md, including "Voice and tone", and do only "S3".
Copy the kp_annual pattern (see frontend/docs/monthly-yearly-kp-reports-end-to-end.md §9).
- Register varshik_rashifal_2027 at 59900 paise with a struck original price of 599900 paise, OFF, tag new.
- It must show in Admin → Features with both prices editable; the purchase charges the admin price (test: admin sets ₹399 → charged ₹399), and Pass discounts apply on top.
- Fixed Jan–Dec 2027 window in findActiveYearlyReportRow.
- Birth time + coordinates purchase guard; the 4 pre-purchase questions.
- Generator with 5 checkpointed LLM calls; humanizer style block in the prompt.
- Completeness contract: VarshikFacts zod schema + preflight (any gap → stop and refund), coverage check (every page, month, area, all 9 doshas, yogas, sky events, the three star pages), verify-claims against VarshikFacts.
- Chapter VI: up to 5 questions from getUserFacts (this birth profile) + the answers, each tied to fact ids and an engine key, never death/illness/legal; timing only from answerWindow and reliefTimeline; the relief page is always written; skip the questions when there are no facts.
- verify-claims gets: polarity, persona, fear/death words, AI-tell counter (on English, before translation), with one regenerate.
Generate 3 test reports (single student, married professional, retired) with the flag on only for the test user. Show me the English text before finishing.
Branch feat/varshik-2027. Don't push.
```

**S4**
```
Sprint 4 of Varshik Rashifal 2027. Read frontend/docs/varshik-rashifal-2027-plan.md and do only "S4: SVG chart components" in frontend/components/reports/varshik/: ScoreRing, AreaBars, AreaMonthLine, TimingMap, MomentumWave, BigMovesGantt, VarshaTimeline, PanchadhikariTable, PlanetImpactTable, DecisionTable, DoshaTable, YogaList, SkyCalendar.
Reuse lib/report-chart-geometry.ts, lib/chart-palette.ts and the existing North-Indian chart. Light and dark. ≥35% room for Indic text, line-height 1.45.
Delegate each component of 80+ lines to local-coder with a full spec, then review with git diff, tsc --noEmit and lint.
Feed the components with sample JSON from the Sprint 3 test report. Show each one in the browser at phone width.
Branch feat/varshik-2027. Don't push.
```

**S5**
```
Sprint 5 of Varshik Rashifal 2027. Read frontend/docs/varshik-rashifal-2027-plan.md and do only "S5".
My assets A1–A53, the Aroha gold logo and Baba Ji's portrait are in <FOLDER>. Follow the plan's "Premium standard" exactly (fonts, grid, gold, motion, Baba Ji letter and seal), and show me screenshots of every page before closing. Convert them to WebP in public/varshphal/, remove the backgrounds from the medallions, icons and A46, and write assets.ts.
- Build VarshikReportView (51 pages, in plan order): contents, chapter openers, area pages, month spreads with festival dates, light and dark themes. Register it in designed-screens.tsx and YEARLY_REPORT_KEYS.
- Add the catalogue card and the generating-sheet wheel with progress steps.
- The catalogue card and the buy sheet show the live admin price and the struck original price from the features API (as other reports do), never prices written into the frontend.
- In-app: tapping a Timing Map cell jumps to that month; decision filter pills.
Delegate large single files to local-coder per CLAUDE.md. Show me the screen in the browser, light and dark.
Branch feat/varshik-2027. Don't push.
```

**S6**
```
Sprint 6 of Varshik Rashifal 2027. Read frontend/docs/varshik-rashifal-2027-plan.md and do only "S6".
The PDF uses the existing lib/pdf DOM-capture pipeline (not @media print):
- each page (59 + N, where N is 0–5 question pages; the three C3 pages are "Your birth stars", "The year's three flags" and "Your stars in 2027") in its own fixed A4 box
- a page whose text is too long shrinks one font step (with a floor) instead of spilling
- PDF under ~15 MB
- file name Varshik-Rashifal-2027-<Name>.pdf
Share cards (year card + 12 month cards, from the A36 background): no birth time, place or coordinates. Save on Android with FileSaver, and on the web with the Web Share API.
The Navatara wheel and the star tables are SVG and lists, so they capture like the other charts; check the wheel at A4 width in Hindi and Tamil.
Prove 59 + N pages in English, Hindi and Tamil with a headless test (N = 0 and N = 5 profiles).
Branch feat/varshik-2027. Don't push.
```

**S7**
```
Sprint 7 of Varshik Rashifal 2027. Read frontend/docs/varshik-rashifal-2027-plan.md and do only "S7".
- Run all new English UI copy through the humanizer skill.
- Translate through apinex free/gemini-3.8-flash with the tone note (respectful "aap" etc.), then run i18n:check.
- Humanizer spot review of the 3 test reports; feed recurring hits back into the prompt rules.
- Playwright e2e (flag on for the test user): buy → generating sheet → screen → PDF, shown failing first.
- Admin price e2e: change the price in Admin → Features, and the catalogue card and the charge both follow. Backend tests for the purchase window and the birth-time guard.
Then stop and ask me before deploying. The order is backend first, then the web, with the switch left OFF.
```

**Final review (Opus 5.5, new chat)**
```
Review branch feat/varshik-2027 against frontend/docs/varshik-rashifal-2027-plan.md: the maths against the JHora fixtures, the text checks, the tone, the 51-page PDF, and the switch OFF. Run /code-review high and list anything that blocks release.
```

## Done when
1. **JHora check (S1).** On the 10 benchmark charts:
   - The solar return is within 2 s.
   - The Varsha Lagna and Sahams are within 0.05°.
   - The Year Lord, Panchavargi, Mudda dasa and Tajika yogas match exactly.
2. **Seam and spread (S1–S2).** The Mudda seam matches exactly on every chart, and the population spread targets above are met.
3. **Text checks (S3).** No tier contradictions, no persona leaks, no fear or death words, and no AI-tell hits above the threshold, across the test profiles (single, partnered, student, no children). The S7 humanizer spot review of 3 full reports finds nothing that needs changing.
4. **No gaps (S3).**
   - On 20 test profiles, the preflight passes and the coverage check finds every page, month, area, all 9 doshas, every yoga, every sky event and the three star pages filled.
   - A profile with a field deliberately removed fails the preflight, gets refunded, and never produces a partial report.
   - Eclipse and station dates match NASA and drikpanchang.
5. **Chapter VI (S3).**
   - A profile with 7 facts gets at most 5 questions, each traceable to a fact.
   - A profile with no facts gets no question pages.
   - No question about death or illness ever appears, even when the facts mention one.
   - Every "when it eases" date matches `answerWindow` and `reliefTimeline`.
6. **PDF and Indic layout (S4–S7).** A headless test, in English, Hindi and Tamil, finds 59 + N PDF pages (N = number of questions), no page box overflowing, and `scrollWidth <= clientWidth` on every label and card.
