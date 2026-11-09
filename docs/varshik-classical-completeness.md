# Varshik Rashifal 2027: classical completeness sprints (C0–C3)

Added 2026-11-07, after the owner asked: "are we not checking which nakshatra the planets move through?" The answer was no, and an audit against the classical texts found more gaps.

These four sprints run **after S5 and before S6**. S6 builds the PDF from the month pages, and these sprints change what those pages say. Run them in order. Each one starts in a new chat.

## Owner decisions (2026-11-07)
- **Transits are read from both the Lagna and the natal Moon.**
  - Keep the Lagna and Varsha-Lagna house layer.
  - Add classical gochar from the reader's own natal Moon: houses, vedha, Moorti, Tara bala and the sensitive stars. That is personal to the reader, not a Moon-sign template.
  - This replaces the earlier "Lagna only" reading of the research spec.
- **Sarvatobhadra chakra** is built, but shipped only if it matches Jagannatha Hora (JHora) on the benchmark charts.
- **Never mention death in the report.** This holds for every technique. The death Sahams (Mrityu, Apamrityu), "death" vedha readings and "death" nakshatra meanings are not computed for output. Vainashika, the 22nd star, is described as a "hard, draining" star, never with the word "destruction".

## Audit: classical techniques against what S1–S3 built

**Annual chart (Tajika)**

| Technique | Status | Source |
|---|---|---|
| Varsha chart, Muntha, Panchadhikari Year Lord, Panchavargiya bala | built | Tajika Neelakanthi; Mehta ch. on Varsheshwara |
| Mudda (Vimshottari) dasha | built | Mehta, Dashas chapter |
| **Patyayini dasha** (from krishamsha and patyamsha) | missing | Mehta: "longitudes of planets minus rasis (Krishamshas), arranged in ascending order" |
| **Mudda Yogini dasha** (completed years + birth nakshatra + 3, divided by 8) | missing | Mehta |
| **Harsha bala** (house position, exaltation or own sign, gender, day/night) | missing | Mehta, Balas chapter |
| **Dwadashavargiya bala** (D1–D12) | missing | Mehta, Balas chapter |
| **Tajika yogas, 16** | 6 built | Missing: Iqbal, Induvara, Manau, Gairi-Kamboola, Khallasara, Duhphali-kuttha, Dutthottha-davira, Tambira, Kuttha, Durupha. They use deeptamsha (orbs). |
| **Sahams** | 8 built | Add the life ones: Yasha, Mahatmya, Asha, Pitru, Matru, Bhratri, Preeti, Karma, Labha, Vyapara, Vanik, Shatru, Deshantara, Jalapatha, Bandhu, Roga (for health care, gently). Never output Mrityu or Apamrityu. |
| **Tri-Pataki chakra** (Lagna, Muntha and Veti pataki; vedha on the Moon and Lagna; the year's overall verdict) | missing | Mehta; panchangbodh.com/varshaphal |
| Natal chart limits the annual chart | rule | Mehta: "The annual chart cannot give what is not promised in the birth chart." The scoring must cap annual promises by natal promise. |

**Transits (gochar)**

| Technique | Status | Source |
|---|---|---|
| House from Lagna and Varsha Lagna, SAV bindus by sign | built | — |
| **House from the natal Moon**, with the classical good-house table for each planet (Jupiter: 2, 5, 7, 9, 11) | missing | Phaladeepika ch. 26 |
| **Vedha and vipreet vedha**, from the Moon. Sun–Saturn and Moon–Mercury never block each other; Rahu and Ketu don't cause vedha. | missing | Phaladeepika 26; ashtakvargajyoti.wordpress.com (Rashi Gochar Vedha) |
| **BAV of the transiting planet** in its sign. Confirm the engine doesn't use SAV only. | check | Ashtakavarga texts |
| **Kakshya**: 8 sub-divisions of 3°45′ each, lords in order Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon, Lagna. A bindu present in the kakshya lord's BAV means good results then. | missing (planned, never built) | Ashtakavarga kakshya literature |
| **Transit nakshatra and pada** for every planet, daily, with the dates each planet changes nakshatra | missing | — |
| **Tara bala (Navatara)** from the birth star. Count inclusive and take the remainder after dividing by 9: 1 Janma, 2 Sampat, 3 Vipat, 4 Kshema, 5 Pratyari, 6 Sadhaka, 7 Vadha, 8 Mitra, 9/0 Ati-mitra. Taras 2, 4, 6, 8 and 9 are good. | missing | vijayalur.com (Tarabala); shrifreedom.org (Navatara) |
| **Star-lord effect**: a transiting planet also gives the results of its nakshatra lord's natal role | missing | standard Parashari/nakshatra practice |
| **Sensitive stars**: Janma 1, Jati 4, Karma 10, Desha 12, Sanghatika 16, Samudaya 18, Vainashika 22, Manasa 25, Abhisheka 28 (28-star count with Abhijit), plus the stars of natal planets. Slow planets crossing them give dated events. | missing | shrifreedom.org (Navatara chakra, special taras) |
| **Moorti nirnaya** at each sign change, from the transit Moon's house from the natal Moon: 1/6/11 Swarna, 2/5/9 Rajata, 3/7/10 Tamra, 4/8/12 Loha | missing | vijayalur.com (Moorti Nirnaya) |
| **Sarvatobhadra chakra**: nakshatra vedha on the birth star, Karma star, tithi, weekday, rashi and Lagna | missing; build, then gate on JHora | Wikipedia (SBC); Narasimha Rao's JHora implements it |

## Birth-chart nakshatras (owner request, 2026-11-07)
"Which planet is in which nakshatra, and how it affects."

Today the facts list each natal planet's nakshatra and pada, but nothing reads them. Add the following.

For **each natal planet and the Lagna**:
- nakshatra, pada, nakshatra lord
- the star lord's own natal house and the houses it rules
- the pada's navamsa sign, gana
- nature (chara / sthira / ugra / mridu / tikshna / kshipra / mishra), deity, symbol, shakti
- KP star lord and sub lord, by reusing `kpLordsFor`
- Gandanta, if any

Then the readings:
- **Planet-in-star.** A planet gives its own significations, coloured by its star lord's house and role. Parashari: a planet in dasha gives the results of its nakshatra lord.
- **Dasha lords' stars in 2027.** The running Maha, Antar and Pratyantar lords and the Mudda lord, each read through its star lord and KP sub lord. The 2027 dasha results depend most on this.
- **Natal Navatara.** Natal planets sitting in Vipat (3), Pratyari (5) or Vadha (7) from the birth star are weakened for their themes. Planets in Janma, Karma and Sanghatika stars are emphasised.
- **Transit over natal stars.** C1's sensitive-star rule also covers the nakshatras of natal planets, so the Sun crossing your natal Jupiter's star is a dated trigger.

**New page in Chapter I, after the birth chart: "Your birth stars".** A 10-row table (9 planets + Lagna) with nakshatra, pada, lord, nature and one plain line each, plus the star lords of the 2027 dasha lords.

**Nakshatra meaning data.** It's missing app-wide; Aroha has only names, lords, gana, yoni and nadi in `lib/shared/constants/astrology.ts`.
- Add `NAKSHATRA_INFO`: deity, symbol, nature (gana is already there), shakti, body part, purushartha, element.
- Each field comes from a checked source: Taittiriya Brahmana for the deities and Muhurta Chintamani for the nature groups. Record the source per field.
- It goes in the shared constants, so chat, the kundli screen and every report can use it.

## Reuse what Aroha already has (and fix it once, for everyone)

| Need | Existing code | Used by Varshik today? |
|---|---|---|
| Nakshatra-change dates | `astro-tools/transit-events.ts` `findNakshatraChanges` | no |
| Tara bala, Chandrabala | `astro-tools/tara-bala.ts` `calculateTaraBala`, `calculateChandrabala`; `decision-engine.ts` `taraOf` | no |
| Moon sign and nakshatra changes | `astro-tools/moon-events.ts` `findMoonChanges` | no |
| KP star lord and sub lord | `calculations/kp-sublord.ts` `kpLordsFor`, `kpLordsForPlanets` | no |
| Gandanta dosha | `doshas/gandanta.ts` `detectGandanta` (BPHS ch. 92) | **no, so the report covers only 8 of Aroha's 9 doshas** |
| Retrograde rules | `calculations/vakri.ts` `analyzeAllVakriPlanets` | no |
| Saturn strength and cycle | `doshas/saturnStrength.ts`, `separation.ts` (Sprint 16) | check |
| Everything about one chart | `intelligence/chart-context.ts` `buildChartContext` | no |
| Sign ingresses and stations | `findTransitEvents` | yes |

Rules:
- Call these functions; don't copy them.
- If one is wrong against JHora or drikpanchang, fix it in the shared module and re-run every report that uses it. This is the owner's fix-once rule.
- **Gandanta becomes the 9th dosha** in `VarshikFacts`, `doshaActivity`, the dosha page and the coverage check.

## How checking works from now on (owner, 2026-11-08)

JHora is the referee for **astrology rules**. Planet movement is checked by machine.

**Gold set.** The 10 hand-copied JHora charts in `backend-varshik/test/fixtures/jhora`. They are complete for: solar return, Varsha Lagna, Muntha, Sahams, Panchavargiya, Harsha and Dwadashavargiya bala, Mudda Vimshottari, Mudda Yogini, Patyayini, and the natal nakshatra, pada, star lord and KP sub lord.

**Still from JHora, by hand:**
- Tri-Pataki for 2027 on b01 and b03–b10.
- Sarvatobhadra on 4 dates, only if the owner wants Sarvatobhadra in the report.
- Nothing else.

**Stop copying by hand:** 2027 transits, Tara and kakshya. Planet positions, sign and nakshatra changes, stations and eclipses are astronomy. Check them automatically against Swiss Ephemeris (pyswisseph, run independently of the engine's wasm build), with drikpanchang and NASA spot checks.

**PyJHora runs here** (memory `pyjhora-runnable`: uv Python 3.11 plus the prebuilt pyswisseph wheel). It is the automated checker for hundreds of charts.
- Always call `drik.set_ayanamsa_mode("LAHIRI")`; its default is True Pushya.
- Measured against the gold set:
  - Solar return: +10–15 s.
  - Varsha Lagna: about 3′, from a solar-motion setting.
  - Sahams: PyJHora differs on the +30° boundary rule and on some Karyasiddhi and Artha cases.
- Where PyJHora and JHora disagree, **JHora wins**. Record each known difference in the tests.

**Not shown by JHora, checked elsewhere:**
- Year Lord: PyJHora `lord_of_the_year`, plus M.S. Mehta's worked examples.
- Tajika yogas: PyJHora `tajaka_yoga`, plus Mehta.
- Gandanta: BPHS ch. 92 and the existing detector tests.
- Tara, vedha, Moorti, kakshya, sensitive stars: rule tables from two written sources, plus worked examples. PyJHora `thaaraabalam` covers Tara.

## Owner accuracy test: a real 2026 report (owner request, 2026-11-08)

The owner wants to see the finished report exactly as a user would, built for **his own birth and the year 2026**, which has nearly passed, so he can judge its accuracy month by month.

- **Data.** It lives in `frontend/.claude/varshik-owner-test.json`: birth details, the answers, and up to 5 concerns. That folder is gitignored. **Never commit it, never copy it into fixtures or the docs, and never send it anywhere except the local engine.**
- **Year as a parameter.** The engine and text are built for 2027. Add a target-year parameter (2026 for this test) through `computeCalendarYearVarshphal`, the scoring, the facts, the text and the page titles. It's dev-only for now, but also the basis for a future Varshik 2028. Every year label must read 2026 in the test, with no "2027" left over.
- **When.**
  1. At the end of C3: the full 2026 and 2027 text for the owner's chart. Show it to the owner.
  2. After S6: the complete 2026 report as the user sees it, on screen and as a PDF. Do this before S7, so his accuracy feedback can still change things.
- **Owner's feedback.** He marks each month and each Chapter VI answer as hit, partly, or miss.
- **Blind test.** Generate the 2026 report from the January 2026 answers and the birth details only. The owner judges it against his own year himself.
- **Use the feedback carefully.** Change a **rule** only where the hits and misses point to a real calculation or weighting error, then recheck against the JHora gold set and the 300-chart PyJHora run. **Never tune the weights to fit one chart**; that would make the report fit the owner and get worse for everyone else.

## C0: Reference data first (Opus 5.5)

This closes the S1 JHora check, which is still open, and covers every new technique. Nothing below counts as accurate until it matches this reference.

1. The owner installs Jagannatha Hora (free, from vedicastrologer.org). Settings: Lahiri ayanamsa, **mean nodes**.
2. Enter the 10 benchmark births, either through computer use (Claude drives JHora) or from the owner's screenshots.
3. For each chart, record for both the 2026 and the 2027 Varsha:
   - solar-return time, Varsha Lagna
   - Muntha, Year Lord, Panchavargiya, Harsha and Dwadashavargiya bala
   - all Tajika yogas, all Sahams
   - Mudda Vimshottari, Mudda Yogini and Patyayini dashas
   - Tri-Pataki
4. For each birth chart, record each planet's nakshatra, pada, star lord and KP sub lord, and any Gandanta.
5. For the year 2027, record: every planet's nakshatra-change dates, the Tara of each slow planet, the Sarvatobhadra vedhas for 4 sample dates, and 10 kakshya spot checks.
6. Save everything as fixtures in `backend-varshik/test/fixtures/jhora/`. Compare the current S1 engine against them, list every mismatch, and fix the S1 ones first.
7. Cross-check the nakshatra-change dates against drikpanchang for 10 dates.

## C1: Transit layer (Opus 5.5)

New engine module `nakshatra-transits.ts` (plus helpers), all pure functions with tests:
- daily nakshatra and pada for each planet, and nakshatra-change times to the minute
- Tara of each transit from the birth star
- star-lord link
- sensitive-star crossings
- house from the natal Moon, with the Phaladeepika good-house table
- vedha and vipreet vedha
- BAV of the transiting planet, and kakshya
- Moorti nirnaya at each sign change

**Birth-chart nakshatra layer** (section above):
- `NAKSHATRA_INFO` in the shared constants
- star lord and KP sub lord for the natal planets and the 2027 dasha lords, using `kpLordsFor`
- natal Navatara
- Gandanta as the 9th dosha
- planet-in-star readings as structured facts

Reuse `findNakshatraChanges`, `calculateTaraBala` and `findMoonChanges` instead of writing new versions; fix them in place if C0 shows they're wrong.

Sarvatobhadra goes in its own module, behind a constant `SBC_ENABLED`. It stays `false` until it matches JHora.

Every constant lives in `config/varshik-weights.ts`. Every rule cites a checked source: book, chapter and verse, or a URL. Never invent verse numbers.

## C2: Tajika completeness (Opus 5.5)
- Patyayini dasha and Mudda Yogini dasha. Both seam-free across the 2026→2027 return, like Mudda.
- Harsha bala and Dwadashavargiya bala.
- The 10 missing Tajika yogas, with deeptamsha orbs.
- The extra Sahams (never Mrityu or Apamrityu), with the shared night and +30° rules.
- Tri-Pataki chakra and its year verdict.
- The natal-promise cap.
- Everything matches the C0 fixtures exactly, the same tolerances as S1.

## C3: Join it all up (Opus 5.5)
1. **Scoring.** Add the new inputs: Moon gochar with vedha and Moorti, Tara and sensitive stars, kakshya, Patyayini and Mudda Yogini alongside Mudda, Harsha and Dwadasha strength, the new yogas and Sahams, the Tri-Pataki verdict and the natal cap. Recalibrate on the 100 synthetic charts and show the owner the before/after tier mix. Re-lock only after the owner agrees.
2. **Completeness contract.** Every new field goes into `VarshikFacts`; a missing field means stop and refund. Extend the coverage check, and extend `verify-claims` so any nakshatra, tara, date, yoga or Saham named in the text must exist in the facts.
3. **Text.** Month pages name nakshatra transits with dates and plain meaning, for example: "Saturn moves into your 10th star from 3 May: work asks for patience and steady effort." Chapter VI answers may use Tara and sensitive-star dates. Gentle-tone and no-death rules apply; Vainashika is "a hard, draining stretch".
4. **Pages.** Three additions, so the total becomes **59 + N**:
   - **"Your birth stars"** (Chapter I, after the birth chart): the 10-row natal nakshatra table, plus the star lords of the 2027 dasha lords.
   - **"Your stars in 2027"** (Chapter III, after the sky calendar): a Navatara wheel of the 27 stars from the reader's birth star, the sensitive stars marked, and the slow planets' crossings with dates.
   - **"The year's three flags"** (Chapter I, after Year Lord and Muntha): Tri-Pataki, plus Patyayini next to Mudda.
   - Update the plan doc's page table, S6's page count and the S6/S7 prompts.
5. **Screen (S5 code).** Sky calendar and month key dates show nakshatra changes, sensitive-star crossings and Moorti; the new pages render light and dark at phone width.
6. **Report back.** Score changes for 3 test profiles, and anything still disagreeing with JHora or drikpanchang.

## C3 status (2026-11-09)

Built and tested, not pushed. See the C3 section of the memory `varshik-c3-status` for what is open. The scoring weights stay **provisional** until the owner agrees to the before/after tier mix.

## L1: Launch placement and pop-up clean-up (owner, 2026-11-09). Sonnet 5.5, before S7

Of the 12 auto-opening pop-ups (mounted in `app/layout.tsx` and `app/page.tsx`), the owner decided:

**Remove:**
- `ShareAppPrompt` ("Share the app & earn ₹100")
- `DailyRewardModal`
- `pass/PassLaunchModal`
- `experience/ExperienceGate`

Remove the auto-open and the mount. Keep any user-tapped entry points and backend pieces they share; delete only what nothing else uses.

**Change:**
- **`FeedbackPrompt` (Rate us):** once ever, after the user's **3rd app open** (the existing `aroha:appOpens` counter). Today it fires after 3 chat replies or 3 minutes after a report. Never on `/reports/*`, never while another pop-up is open.
- **`PermissionsPrompt`:** on native Android, ask **once a week** after "Not now", as the web already does, instead of on every launch.

**Keep:**
- Splash, the welcome for new users, the tour.
- `UpdatePrompt`: dormant today; check that `LATEST_PLAY_BUILD` is current when an important build ships.
- `FestivalGiftModal`: only shows while the owner runs a campaign.
- The circle-invite redirect.

**Bug fix.** `UpdatePrompt.tsx` (about lines 56–58) and `ShareAppPrompt.tsx` (76–78) have `// Never render underneath…` written inside JSX children, which renders as visible text. Turn them into `{/* */}` comments (moot for ShareAppPrompt once it's removed).

**New: Varshik launch pop-up (`ReportLaunchModal`).**
- **Model:** copy the `PassLaunchModal` pattern.
- **Once per user, ever:** stored per user on the server, so a reinstall or a new device doesn't repeat it, plus a local key.
- **Skips a brand-new user's first visit.**
- **Waits** for the splash, welcome, tour, permissions and any gift campaign.
- **Shows only when BOTH are on:** its own switch `home.varshikLaunchPopup` (OFF by default, tag `new`) and the report's switch `reports.varshik_rashifal_2027`. Never for a hidden report.
- **Content:** the cover art, short humanized copy in all 14 languages, a "See your 2027" button to the report's catalogue card or buy sheet, and a close button.
- **Analytics:** shown / clicked / closed, as for the Pass launch.
- **No push notification** (owner).

**At most one pop-up per app open.** Priority order: Update → Permissions → Welcome/Tour → Varshik launch → Festival gift → Rate us. A lower one waits for a later visit. Today several can stack.

**New: "Featured" report, set from Admin.**
- Add a per-report **Featured** switch in Admin → Features. Featured reports sort above everything, including `isNew`, on `/reports` (both tabs, where the report applies) and in the home slider.
- With several featured, keep catalogue order.
- Varshik starts featured = **off**. The owner turns it on with the launch.
- Today the only way to reach the top is the 14-day `isNew` window after a switch is turned on.

**Tests** (each shown failing first):
- the removed pop-ups never open;
- Rate us appears only on the 3rd open, once;
- Permissions asks again only after 7 days on native;
- the launch pop-up shows once per user and never with either switch off, nor on a first visit;
- only one pop-up per open;
- featured sorts first.

**Live changes.** Everything in this sprint except the Varshik pop-up and the Featured switch's starting state affects all current users, so it goes on the release list (frontend; backend first if a server-side "seen" field is added).

## L1 status (2026-11-09)

Built and tested, not pushed. Commits: backend-varshik (switches, `isFeatured`, `popupsSeen`, migration 0108) and frontend.

**What was built**
- Removed `ShareAppPrompt`, `DailyRewardModal`, `PassLaunchModal` and `ExperienceGate` (mounts and files). Kept what other features use: `ShareOptionsSheet`, `DailyRewardLadder` and the daily claim, `ExperienceCards`, the Pass page. The `home.passLaunchPopup` switch is gone from the registry and from the Pass go-live card; old rows for it are ignored.
- One pop-up per app open: `lib/popup-slot.ts` (the rule, unit tested) and `providers/popup-slot-provider.tsx`. Update, Permissions and Welcome/Tour keep their existing first-run sequence; Varshik launch, Festival gift and Rate us never open after any of them, and a lower one waits for a later visit. This is the one reading of the spec worth checking: a strict "one" would make a brand-new user wait a visit for the tour.
- Rate us: once, from the 3rd app open (`lib/app-opens.ts`, the old `aroha:appOpens` counter, now kept by `FeedbackPrompt`). The old "3 chat answers" and "after a report" triggers no longer open it. Never on `/reports/*`.
- Permissions: `lib/permissions-reask.ts`, a week after "Not now", on Android as well as the web.
- `UpdatePrompt` comment text fixed (`{/* */}`).
- Varshik launch pop-up: `components/reports/ReportLaunchModal.tsx`, `lib/launch-popup.ts`, copy in `i18n/roadmap/varshik-launch.ts` plus the eight other language files. Needs `home.varshikLaunchPopup` AND `reports.varshik_rashifal_2027`, both OFF by default. Once per user, ever: server `popupsSeen` plus a local key. Skips a new user's first visit. No push. The button goes to `/reports`, where Featured or New puts Varshik first.
- Featured: one `reports.featured_<report key>` switch per report in Admin → Features (group Reports), all OFF. A featured report sorts above New on `/reports` and in the Home slider; several keep catalogue order.

**Release list (live changes for every user)**
1. Backend first (migration 0108 adds `users.popups_seen`; the new `/v1/me` field and `isFeatured` come with it).
2. Frontend: the four pop-ups disappear for everyone, including the Pass launch popup and the "choose your experience" prompt for existing users who have not picked.
3. Frontend: Rate us moves to the 3rd open (anyone past 3 opens who never saw it will get it on their next open, once).
4. Frontend: Android Permissions asks once a week, not every launch.
5. Frontend: Festival gift and Rate us now yield to a Varshik pop-up and to each other (one per open).
6. Not live until the owner turns it on: the Varshik launch pop-up (`home.varshikLaunchPopup`) and every Featured switch.

**Translations.** The pop-up copy is in all 14 languages, written by hand, not run through apinex. Re-run through apinex if the owner wants the rule applied.

## C5: Indian calendar correctness (from the owner's Gemini review, checked 2026-11-09). Opus 5.5, after the asset pass, before the final review

Gemini's 2027 dates were checked against Swiss Ephemeris (Lahiri). All ingresses, stations and eclipses agree to within about 1–2 minutes. It found three real gaps, confirmed in our code:

**1. Eclipses are not classified.**
- **The problem.** `panchang/eclipse.ts` throws away the type: its comment says "eclipse TYPE … discarded". `year-events.ts` keeps only the date.
- **The facts (Swiss Ephemeris):**

  | Date | Type | In India |
  |---|---|---|
  | 6 Feb | Annular solar, Sun in Capricorn | Not visible |
  | 21 Feb, 02:42–06:43 IST | Penumbral lunar (mag 0.93) | |
  | 18 Jul | Penumbral lunar (mag 0.001) | Imperceptible |
  | 2 Aug | Total solar, globally | Partial, the ONLY eclipse visible from India: Delhi 15:54–17:03, 17% · Mumbai 15:47–17:32, 43% · Guwahati 16:26–16:53, 3% |
  | 17 Aug | Penumbral lunar | Moon below the horizon in India |

- **The fix:**
  - Keep the type and magnitude (via the C return flag, `sol_eclipse_how` / `lun_eclipse_how`, called directly through ccall as the file already does).
  - Compute local contact times and visibility with `sol_eclipse_when_loc` / `lun_eclipse_how`. Use the reader's CURRENT location if the profile has one. Otherwise show the India-wide summary (5 major cities), labelled as such. Never silently use the birth place.
  - Classify each eclipse as **Grahan** (umbral and visible), **Upachchaya** (penumbral: no Sutak, many Panchangs omit it), or **Not visible in India**.
  - Sutak only for a Grahan, counted from local first contact: solar 12 h (4 prahar), lunar 9 h (3 prahar).
  - Penumbral and invisible eclipses are never personal triggers in the scoring or the text. They are shown on the sky calendar as plain markers.
  - Fix `eclipse.ts` once, for chat and every other report too (fix-once).
  - Check against NASA and drikpanchang.

**2. Marriage and home timing ignore the classical no-muhurat periods.**
- **The problem.** `decisionTable` uses no combustion at all.
- **The 2027 windows (Swiss Ephemeris, Lahiri):**
  - **Venus combust (Shukra Asta), 7 Jul – 18 Sep**, at a 10° orb.
  - **Jupiter combust (Guru Asta), 16 Aug – 15 Sep**, at an 11° orb.
  - **Kharmas**: Sun in Sagittarius until 14 Jan, and in Pisces 15 Mar – 14 Apr; Sun back in Sagittarius 16 Dec.
  - **Chaturmas**: Devshayani to Devuthani Ekadashi, dates from the existing festival table.
- **The fix.** Rows for marriage, commitment, griha pravesh and property must never put a "go" window inside these. Say so plainly ("Venus is combust: traditionally no wedding muhurat until 18 Sep").
- **Sources.** Combustion orbs: cite a checked source (Surya Siddhanta or BPHS orbs; Venus 10°/8° when retrograde, Jupiter 11°). Muhurta exclusions: Muhurta Chintamani. Cite checked sources only.

**3. Transit houses don't say their reference.**
- `BigMovesGantt` shows "house N" (from the natal Lagna) with no label. Show both views, e.g. "6th from your Lagna · 3rd from your Moon", in the gantt, the month key dates and the text. Sade Sati and Dhaiya already say "from your Moon".

**Also:**
- The share card shows the Moon sign and Lagna next to the peak months.
- The final review checks dark-mode contrast on dense tables (sky calendar, nakshatra rows).

**Skipped:**
- Consultation booking (Aroha doesn't sell consultations; at most an "Ask Baba Ji" link, owner's call).
- Persona ratings (opinion).
- "True Chitra Paksha": the engine's Lahiri is deliberate and matches drikpanchang (see `varshik-c0-status`).

## C5 status (2026-11-09)

Built and tested, not pushed.

**Eclipses.** `panchang/eclipse.ts` now keeps the type, magnitude and contacts, and works out the local times, visibility, class and Sutak (`classifyEclipse`). Chat, Calendar, Decide and every report read this one module. Chat now judges visibility at the account's current location, or gives a labelled India summary; it no longer uses the birth place. Checked in `test/varshik-c5.spec.ts`:
- NASA: all 5 types; magnitudes 1.080 (NASA 1.079) and 0.929 (0.928).
- Drikpanchang: 21 Feb penumbral contacts 02:42 to 06:43 (drik 02:43 to 06:42); penumbral magnitude 0.927 (drik 0.91).
- The C5 table: Delhi 15:53 to 17:02, 17%; Mumbai 15:47 to 17:31, 43%; Guwahati 16:26 to 16:52, 3%. All within 1 to 2 minutes.

India classes for 2027:
- 6 Feb and 17 Aug: not visible.
- 21 Feb and 18 Jul: Upachchaya.
- 2 Aug: Grahan, with Sutak from about 03:50 IST.

**Closures.** `reports/varshik-muhurta.ts` uses the shared `isCombust` orbs. A day counts as closed if any part of it falls inside the period. The 2027 dates (Delhi), with the exact crossings for the two Astas:
- Shukra Asta: 6 Jul to 17 Sep (Venus 6 Jul 20:42 to 17 Sep 22:48 IST).
- Guru Asta: 16 Aug to 15 Sep.
- Kharmas: 1 to 14 Jan, 15 Mar to 14 Apr, 16 to 31 Dec.
- Chaturmas: 14 Jul to 9 Nov.

The plan's 7 Jul to 18 Sep for Shukra Asta was a day late at each end. Drikpanchang's own visibility-based dates (Venus 21 Jul to 9 Sep, Jupiter 17 Aug to 13 Sep) fall inside these windows.

Devuthani Ekadashi was added to both festival tables for 2025 to 2029 (drikpanchang Smarta dates; 2027 is 10 Nov).

The marriage, commitment and move-home rows only take months with at least 7 open days. Each row carries its open days, its closures, and where each rule comes from:
- 'panchang': drikpanchang states the rule for this event.
- 'report': the owner's rule for this report. This covers Kharmas and Chaturmas for a move-in, and all four periods for a commitment. Drikpanchang lists griha pravesh dates in Meena and property dates inside Chaturmas.

**Houses.** Every sky event and slow-transit row has a `moonHouse`. The gantt, the sky calendar, the month key dates and the prompt all say "Nth from your Lagna · Nth from your Moon". Verify checks Moon-counted houses against their own index and flags a transit house that names no reference.

**Text.** In the prompt, only a Grahan names houses, times and Sutak; Upachchaya and unseen eclipses are plain markers. The when_to_act section must name every closure. Coverage and verify enforce both rules.

**Share card.** The year card shows the peak months, Moon sign and Lagna.

**Sky strip legend.** Each kind of mark has its own shape, and the legend lists only the kinds the year holds: dot for a sign change, triangles for retrograde and direct, filled and open diamonds for going combust and leaving combustion, solid and hollow gold for a Grahan and a marker eclipse. Marks sit at least 7 days apart (up to 12 rows), so none touch or are dropped.

**Translations.** 50 strings went through apinex, in `i18n/roadmap/varshik-c5`. Apinex mistranslated the Jyotish terms in the Indian languages (Telugu 'repentance' for retrograde, 'burning' for combust, transliterated 'retrograde'), so those strings are written by hand with the standard terms: Hindi/Marathi वक्री/मार्गी/अस्त/उदय/उपच्छाया, Telugu and Kannada మౌఢ్యమి/ಮೌಢ್ಯ for combust, Tamil வக்கிரம்/அஸ்தங்கம், Gujarati કમુરતાં for Kharmas. A native review is still advisable.

**Owner decisions (2026-11-09), built:**
1. **Asta** for muhurat blocking comes from drikpanchang's published dates (visibility based), stored in `backend config/asta-dates.ts` with source URLs. 2026 and 2027 are in; drikpanchang did not yet serve 2028 or 2029 (every URL returned the 2027 page). Preflight refuses a year without Asta rows. 2027: Venus 21 Jul to 9 Sep, Jupiter 17 Aug to 13 Sep. The fixed Surya Siddhanta orbs stay for strength and combustion in the scoring. Weddings on 7 to 13 Jul are open; Chaturmas closes them from 14 Jul.
2. **Moving home** is closed by Asta only, with a soft line about Kharmas and Chaturmas.
3. **Property purchase** is its own row (`buy_property`), with no block.
4. **Engagement** has no block, only a soft line about the sagai date.
5. **Decide** avoids only a Grahan seen at the user's place. The test showed the old behaviour failing first. It is on the release list in the plan's S7.

**Also fixed:** below-horizon contacts in `classifyEclipse` (Swiss returns 0; the rise or set time is now the edge). The waiting screen follows `progress.total`, and `VARSHIK_TEXT_GROUPS` is shared by the generator, the API and its test.

**Pre-existing test failures** (they also fail on origin/main e293ea57): `test/users.spec.ts` (5) and `test/insights-birth-time.spec.ts` (4 or 5, timeouts).

## S6 verified and the owner's 2026 test (2026-11-09)

**S6 PDF.** The headless check (`e2e-pdf/varshik-pdf.spec.ts`) now covers 12 PDFs: two data sets (`live`, a real report saved before C5; `sample`, the current facts schema) in English, Hindi and Tamil, each with 0 and 5 question pages. Every one has exactly 59+N A4 pages, is under 15 MB (largest: Tamil with 5 questions, 13.9 MB), and has **zero clipped pages**. The owner set the clipping allowance to zero for every language. Fixes:
- In columns, prose paragraphs and the sky calendar's month blocks may run into the next column. Cards and list rows stay whole, and a heading never ends a column on its own.
- Cards on a printed page are tighter.
- A last-resort "dense" step tightens the line spacing and gaps; the text size stays the same.
- Lists that allow it (the sky calendar) may use 4 columns at that last step.
- The printed sky calendar uses short house labels ("L9 · M5", with a key line), a wider event strip, and one paragraph per eclipse.

The share cards pass (no birth details). The cover sets the name on the dashed line, including a long one. Scratch scripts `exp.mjs`, `exp2.mjs` and `lists.mjs` were removed from `e2e-pdf`.

**Owner's 2026 test.** Generated with `backend-varshik/scripts/varshik-owner-test.ts 2026 <scratchpad>/owner --answers asof2026`: 39 sections, 11 model calls (5 regenerates), 5 style flags. Shown on screen at `/varshik-preview?view=owner` (dev only). The page reads `frontend/.claude/varshik-owner-report.json`, which is gitignored, through `app/varshik-preview/owner-data` (404 in production or when the file is missing). PDF: `Varshik-Rashifal-2026-<Name>.pdf`, 60 pages (59 + 1 question), 10.3 MB, nothing clipped. Every "2027" left on its pages is a real date: the second Varsha chart running to 18 Apr 2027, a Mudda period into January 2027, and relief dates in 2027. A marking sheet (month, score, first line, hit/partly/miss) sits beside the PDF in the scratchpad. **Awaiting the owner's marks.**

## PDF cover (owner, 2026-11-09). Built in S6, the art is fixed in the asset pass

**Source.** `C:\Users\wookiee\Downloads\1794132680584.png`, 1696×2528 PNG (portrait, ratio 0.671; A4 is 0.707). It replaces the A1 cover for the **PDF** and is also used as the in-app cover.

**What's baked into the image (keep it):**
- "VARSHIK RASHIFAL", "YEARLY HOROSCOPE & ABUNDANCE", seven captioned medallions (Love, Career, Health, Fame, Wealth, Peace, Abundance), the zodiac wheel, and "Prepared for" with a dashed gold line.
- Because the text is baked in, the cover is English in every language. The owner accepts this.
- There is no year on it.

**The name.** Written on the dashed line, in the same look.
- **Line position, in source pixels:** the dashes run at y ≈ 2227, from x ≈ 691 to 1468. "Prepared for" letters span y 2165–2240 (75 px tall).
- **Place the name** left-aligned from x ≈ 700, baseline sitting just above the dashes. Cap height ≈ the "P" of "Prepared".
- **Shrink to fit.** Long names reduce in size to stay within the line, never wrap and never cross x 1468.
- **Font: match the script.** It's generated lettering, not a real font, so pick the closest Google script font by rendering candidates next to the baked "Prepared for" and comparing: Great Vibes, Pinyon Script, Alex Brush, Parisienne, Petit Formal Script. Self-host the chosen one.
- **Devanagari and other scripts.** Names entered in Devanagari or another Indic script fall back to a matching serif (Noto Serif *script*), in the same gold.
- **Colour.** A vertical gradient sampled from the lettering: top `#F2DB97` → middle `#E7C897` → bottom `#D5B790`, with a soft dark shadow like the baked text.
  - Render the name as an SVG `<text>` with an SVG `linearGradient` fill. Don't use CSS `background-clip:text`, which breaks the PDF capture (S4 rule).
- **Show the owner** the cover with three names: short ("Asha"), long ("Venkatalakshmi Raghunathan"), and one in Devanagari.

**Fixes before shipping:**
1. **Gemini watermark, bottom-right.** This is the large ~96 px mark at this image size. Remove it with the same reverse-alpha method: re-measure the alpha for the 96 px mark, or scale `alpha48.npy` up and touch up with inpainting. The ornate corner border sits under it, so check at 3× zoom that no ghost remains.
2. **Zodiac wheel order.** Taurus and Leo look swapped:
   - the Leo glyph sits left-lower, after Aries, where Taurus belongs;
   - the Taurus glyph sits bottom-right, between Cancer and Virgo, where Leo belongs.
   - The other 10 are in correct zodiac order.
   - Confirm at full zoom. If confirmed, swap the two glyph patches (same cell shapes; blend the edges), or ask the owner to regenerate. **A wrong wheel must not ship.**
3. **Size.** Upscale 3× with Real-ESRGAN (asset pass).
4. **Fitting it to A4.**
   - Scale to the A4 height and centre it.
   - The ~2.5% gap left on each side is filled with the cover's own edge navy.
   - Never crop: the top stars and the bottom border ornament touch the edges.

**Status 2026-11-09 (built in C3, ahead of S6).**
- `public/varshphal/cover.webp` (1696 wide, the in-app cover) and `public/varshphal/hd/cover.webp` (3x, 5088 x 7584, Real-ESRGAN x4plus-anime scaled to 3x) are made from the source with the Gemini mark removed.
- Mark removal: alpha 0.49 measured on the mark over plain navy, the star shape fitted (centre 87.5/87.5 in a 200 px crop at x 1496, y 2328; p 0.7, radius 51), reverse-alpha for the gold ornament under it, navy refilled by diffusion. A faint trace of the bottom tip beside the ornament remains at 3x zoom.
- Name: `components/reports/varshik/VarshikCover.tsx` (SVG text, gradient fill, drop shadow, shrinks to fit x 700 to 1468, writes itself in the app via `writeOn`, `a4` variant for S6 with the edge-navy fill). Font Alex Brush (compared against Great Vibes, Pinyon Script, Parisienne, Petit Formal Script, Italianno, Allura), self-hosted by next/font in app/layout.tsx; Indic names use the matching Noto Serif.
- Taurus/Leo: NOT swapped. At full zoom the glyph in the Leo place (between Cancer and Virgo) is a loop with a curled tail, which is how a Leo glyph is drawn, and the glyph after Aries is a circle with a stem, nearer Taurus than Leo. The swap the audit expected is not confirmed; the owner decides.

**Note for the owner.** The cover's seven themes (Fame, Peace, Abundance…) differ from the report's seven life areas (Love, Career, Money, Health, Family, Growth, Travel). That's fine as artwork, but say so if you want them aligned.

## Start prompts

**C0**
```
Sprint C0 of Varshik Rashifal 2027 (reference data). Read frontend/docs/varshik-classical-completeness.md and frontend/docs/varshik-rashifal-2027-plan.md, plus memory varshik-s1-engine-status. Do only "C0".
Ask me first whether I have installed Jagannatha Hora and whether you should drive it with computer use or I send screenshots. Settings: Lahiri, mean nodes.
Record the 10 benchmark charts exactly as C0 lists, save fixtures under backend-varshik/test/fixtures/jhora/, then compare the current engine and list every mismatch. Fix S1 mismatches on branch feat/varshik-2027 in backend-varshik. Don't push.
```

**C1**
```
Sprint C1 of Varshik Rashifal 2027 (transit layer). Read frontend/docs/varshik-classical-completeness.md (owner decisions + audit) and the plan doc. Do only "C1" in backend-varshik, branch feat/varshik-2027.
Include the "Birth-chart nakshatras" section (NAKSHATRA_INFO in shared constants with a checked source per field, star lord + KP sub lord via kpLordsFor, natal Navatara, Gandanta as the 9th dosha, dasha lords' stars). REUSE findNakshatraChanges, calculateTaraBala, findMoonChanges, kpLordsFor, detectGandanta — never copy; fix shared code in place (fix-once) if C0 shows it is wrong.
Build every C1 function as pure, tested code; all constants in config/varshik-weights.ts; cite only checked sources, never invented verse numbers; no death outputs. Match the C0 JHora fixtures and drikpanchang dates. Sarvatobhadra behind SBC_ENABLED=false until it matches JHora. Delegate test suites of 80+ lines to local-coder per CLAUDE.md. Don't push.
```

**C2**
```
Sprint C2 of Varshik Rashifal 2027 (Tajika completeness). Read frontend/docs/varshik-classical-completeness.md and the plan doc. Do only "C2" in backend-varshik, branch feat/varshik-2027.
Patyayini + Mudda Yogini dashas (seam-free), Harsha + Dwadashavargiya bala, the 10 missing Tajika yogas with deeptamsha, the extra Sahams (never Mrityu/Apamrityu), Tri-Pataki, the natal-promise cap. Every number must match the C0 JHora fixtures. Cite only checked sources. Don't push.
```

**C3**
```
Sprint C3 of Varshik Rashifal 2027 (join it up). Read frontend/docs/varshik-classical-completeness.md, the plan doc, and memories varshik-s2-scoring, varshik-s3-wrapper-text, varshik-s5-screen. Do only "C3" across backend-varshik and frontend (branch feat/varshik-2027).
Add the C1+C2 inputs to scoring, recalibrate on the 100 charts and show me the before/after tier mix before re-locking; extend VarshikFacts, coverage and verify-claims; update month-page and Chapter VI text (gentle tone, no death, Vainashika = "hard, draining stretch"); add the three new pages (total 59 + N; Gandanta joins the dosha page as the 9th dosha) and update the plan's page table and the S6/S7 prompts; update the screen. Show me screenshots and 3 profiles' score changes. Don't push.
```

## Sources consulted (2026-11-07)
- M.S. Mehta, *Annual Horoscope (Varshaphala or Tajak): Effective Predictive Techniques* (266 pp.), astrofoxx.files.wordpress.com/2018/11/jyotish_annual-horoscope_varshaphala_m-s-mehta.pdf
- panchangbodh.com/varshaphal: Pancha-vargiya point scale (Kshetra 30, Uccha 20, Hadda 15, Drekkana 10, Navamsa 5; Vishwa bala ÷ 4; above 15 is Parakrami), Tri-Pataki flags
- vijayalur.com: Tarabala (2011/10/02); Moorti Nirnaya (2011/04/22); Introduction to Varshaphal (2016/01/21)
- shrifreedom.org/vedic-astrology/navatara-chakra/: special taras (Karma 10, Sanghatika 16, Samudaya 18, Vainashika 22, Manasa 25, Jati 4, Desha 12, Abhisheka 28)
- ashtakvargajyoti.wordpress.com/2015/01/30/rashi-gochar-vedha-transit-based-planetary-obstruction/: vedha table and its exceptions
- Phaladeepika ch. 26 on Jupiter's vedha: srivarahamihira.medium.com (Guru's Gochara Phala)
- en.wikipedia.org/wiki/Sarvatobhadra_Chakra: construction and vedha
- Kakshya order Saturn → Lagna: ramibhatti.medium.com (Ashtakvarga timing), plus the ResearchGate paper "Importance of Kakshya in Ashtakavarga"

The secondary web sources above are leads. The JHora fixtures from C0 decide every disagreement.
