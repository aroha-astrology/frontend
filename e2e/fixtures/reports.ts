/**
 * One ready report per report type, for layout checks across every report
 * screen (see e2e/report-layout.signed-in.spec.ts).
 *
 * Each one carries the facts its screen draws, shaped like the backend's own
 * `XScores` types, plus the model-only keys the server attaches to every
 * report's `scores` (GROUNDING below). Those are written for the model, not the
 * reader, and no screen may print them.
 */

const LONG =
  "Saturn's slow passage through your tenth house asks for steady, unglamorous work this year, and the " +
  "chart rewards exactly that: what you build patiently between spring and the monsoon holds.";

const HEADER = {
  name: "Asha Venkataraghavan",
  dob: "1992-07-21",
  lagnaSign: "Libra",
  moonSign: "Taurus",
  moonNakshatra: "Rohini",
  currentMahadasha: "Saturn",
  currentAntardasha: "Mercury",
  dashaEndsOn: "2027-03-14",
};

const VERDICT = {
  headline: "A steady year that rewards patience more than speed.",
  bullets: [`First takeaway. ${LONG}`, `Second takeaway. ${LONG}`, "Third takeaway, short."],
  nextStep: "Pick one remedy and keep it for forty days before adding another.",
};

const PLANET_STRENGTH = [
  { planet: "Sun", pct: 112, isStrong: true, isRetrograde: false, isCombust: false },
  { planet: "Moon", pct: 87, isStrong: false, isRetrograde: false, isCombust: false },
  { planet: "Mars", pct: 131, isStrong: true, isRetrograde: false, isCombust: false },
  { planet: "Mercury", pct: 69, isStrong: false, isRetrograde: false, isCombust: true },
  { planet: "Jupiter", pct: 104, isStrong: true, isRetrograde: true, isCombust: false },
  { planet: "Venus", pct: 96, isStrong: false, isRetrograde: false, isCombust: false },
  { planet: "Saturn", pct: 142, isStrong: true, isRetrograde: false, isCombust: false },
];

/** Text that must never be visible on any report screen. */
export const MODEL_ONLY_TEXT = [
  "motional speed",
  "Cheshta Bala",
  "enhanced_intensity",
  "VAKRI Jupiter interpretation",
  "Do NOT quote these percentages",
  "BIRTH TIME NOT KNOWN",
  "Do NOT state the Ascendant",
  "Sarvashtakavarga bindus",
  "internalDebugNote",
];

/** What reports.service.ts adds to every report's scores for the model's benefit. */
const GROUNDING = {
  vakriFacts: [
    "Jupiter is retrograde in house 11 (Virgo) with motional speed -0.1149°/day.",
    "Jupiter possesses 60 Virupas Cheshta Bala (maximum motional capacity).",
    "Classical Uttara Kalamrita modifier: enhanced_intensity.",
    "VAKRI Jupiter interpretation — Classical: Jupiter is in Vakri (retrograde) motion in Virgo | Interpretive: … | Karmic: … (confidence: high)",
  ],
  planetCondition: [
    "Mercury: 69% of required Shadbala, combust.",
    'STRENGTH RULE: Do NOT quote these percentages or the word "Shadbala" to the user.',
  ],
  birthTimeCaveat:
    "BIRTH TIME NOT KNOWN: this person could only say they were born in the morning (6am–12pm). Do NOT state the Ascendant.",
  vargas: [{ key: "D9", lagna: "Leo", planets: { Sun: "Aries", Moon: "Cancer" } }],
  ashtakavargaSummary: ["House 10 holds 31 Sarvashtakavarga bindus (strong)."],
  userAnswers: { job: "salaried" },
  readerSituation: { job: "salaried" },
  // A key no screen knows about: stands in for whatever the server adds next.
  internalDebugNote: "internalDebugNote: sample seed 42",
};

const DOSHA_YOGA = {
  positives: [
    { label: "Gaja Kesari Yoga", detail: "Jupiter in a kendra from the Moon." },
    { label: "Shasha Yoga", detail: "Saturn in own or exalted sign in a kendra house." },
  ],
  cautions: [{ label: "Mangal Dosha", detail: "Mild; cancelled in part by Jupiter's aspect." }],
};

const WINDOWS = [
  {
    startDate: "2026-11-02T00:00:00.000Z",
    endDate: "2027-02-18T00:00:00.000Z",
    score: 82,
    level: "HIGH",
    dashaLevel: "antardasha",
    reasoning: ["Venus antardasha", "Jupiter transits the 7th from the Moon"],
    summary: "Venus runs the period and Jupiter supports the seventh house.",
  },
  {
    startDate: "2027-06-10T00:00:00.000Z",
    endDate: "2027-09-01T00:00:00.000Z",
    score: 61,
    level: "MEDIUM",
    dashaLevel: "pratyantardasha",
    reasoning: ["Moon pratyantardasha"],
  },
];

const AGE_BANDS = [
  { label: "24–27", startAge: 24, endAge: 27, confidence: "LOW" },
  { label: "28–31", startAge: 28, endAge: 31, confidence: "HIGH" },
  { label: "32–35", startAge: 32, endAge: 35, confidence: "MEDIUM" },
];

const ARCHETYPE = {
  label: "The Steady Builder",
  description: LONG,
  traits: [
    { label: "Patience", score: 82 },
    { label: "Risk appetite", score: 34 },
    { label: "Generosity", score: 67 },
  ],
};

const DECADE_ARC = [
  { label: "Age 20–30", startDate: "2012-07-21", endDate: "2022-07-21", score: 48, tone: "mixed" },
  { label: "Age 30–40", startDate: "2022-07-21", endDate: "2032-07-21", score: 72, tone: "favorable" },
  { label: "Age 40–50", startDate: "2032-07-21", endDate: "2042-07-21", score: 39, tone: "challenging" },
];

const PLANET_REMEDIES = [
  {
    planet: "Saturn",
    house: 10,
    remedies: [
      "Feed crows and stray dogs on Saturdays.",
      "Keep a square piece of silver with you.",
      "Do not build a house before the age of 48.",
    ],
    totke: ["Offer mustard oil at a Shani temple on Saturday evening."],
  },
  {
    planet: "Jupiter",
    house: 11,
    remedies: ["Wear yellow on Thursdays.", "Serve your father and teachers."],
    totke: ["Apply a saffron tilak before leaving for important work."],
  },
];

const GUNA_BREAKDOWN = [
  { name: "Varna", score: 1, maxScore: 1, description: "Spiritual compatibility and ego levels." },
  { name: "Vashya", score: 2, maxScore: 2, description: "Mutual attraction and control." },
  { name: "Tara", score: 1.5, maxScore: 3, description: "Birth-star compatibility and destiny." },
  { name: "Yoni", score: 3, maxScore: 4, description: "Physical and intimate compatibility." },
  { name: "Graha Maitri", score: 5, maxScore: 5, description: "Mental compatibility and friendship." },
  { name: "Gana", score: 6, maxScore: 6, description: "Temperament." },
  { name: "Bhakoot", score: 0, maxScore: 7, description: "Emotional and financial harmony." },
  { name: "Nadi", score: 8, maxScore: 8, description: "Health and progeny." },
];

const MILAN_SCORES = {
  gunaMilanScore: 26.5,
  gunaMaxScore: 36,
  gunaBreakdown: GUNA_BREAKDOWN,
  dashakootaScore: 7,
  dashakootaMaxScore: 10,
  dashakootaCompatibility: "good",
  dashakootaBreakdown: [
    { name: "Dina", score: 1, maxScore: 1, description: "Day-to-day harmony." },
    { name: "Rajju", score: 0, maxScore: 1, description: "Longevity of the bond." },
  ],
  manglikStatus: { person1: true, person2: false, cancelled: true },
  compatibilityBand: "good",
  primaryDoshaYoga: DOSHA_YOGA,
  riskFactors: [
    { key: "wealth", severity: "benefit", score: 78, evidence: ["Both 2nd lords are strong."] },
    { key: "health", severity: "neutral", score: 55, evidence: [] },
    { key: "children", severity: "caution", score: 41, evidence: ["5th lord afflicted in one chart."] },
    { key: "harmony", severity: "benefit", score: 81, evidence: [] },
    { key: "career", severity: "neutral", score: 58, evidence: [] },
    { key: "timing", severity: "caution", score: 44, evidence: [] },
    { key: "intimacy", severity: "benefit", score: 74, evidence: [] },
    { key: "inlaws", severity: "serious", score: 22, evidence: ["4th house under Saturn and Rahu."] },
  ],
};

const MONTHLY = {
  periodMonth: "2026-10-01",
  activeMahadashaLord: "Saturn",
  activeAntardashaLord: "Mercury",
  monthScore: 64,
  keyHouses: [5, 7, 11],
  tone: "favorable",
  doshaYoga: DOSHA_YOGA,
  subPeriods: [
    { startDate: "2026-10-01", endDate: "2026-10-09", lord: "Venus", score: 78 },
    { startDate: "2026-10-09", endDate: "2026-10-21", lord: "Sun", score: 49 },
    { startDate: "2026-10-21", endDate: "2026-11-01", lord: "Moon", score: 66 },
  ],
};

interface Section {
  id: string;
  heading: string;
  hook?: string;
  paragraphs: string[];
  bullets?: string[];
  items?: Array<Record<string, unknown>>;
}

/** Narrative sections with the report's real section ids, in backend order. */
function sections(ids: string[]): Section[] {
  return ids.map((id, i) => ({
    id,
    heading: `Section ${i + 1}`,
    hook: `Hook ${i + 1}: what this part is about.`,
    paragraphs: [`${id} body. ${LONG}`, LONG],
    bullets: i === 0 ? ["A short point.", `A long point. ${LONG}`] : undefined,
  }));
}

interface ReportFixture {
  status: "ready";
  reportKey: string;
  periodMonth: string | null;
  scores: Record<string, unknown>;
  sections: Section[];
}

function report(
  reportKey: string,
  scores: Record<string, unknown>,
  sectionIds: string[],
  periodMonth: string | null = null,
): ReportFixture {
  return {
    status: "ready",
    reportKey,
    periodMonth,
    scores: { header: HEADER, ...scores, planetStrength: PLANET_STRENGTH, ...GROUNDING, verdict: VERDICT },
    sections: sections(sectionIds),
  };
}

const KP_AREAS = ["career", "money", "love", "family", "health"] as const;
const KP_LORDS = ["Moon", "Moon", "Moon", "Moon", "Moon", "Moon", "Moon", "Mars", "Mars", "Mars", "Mars", "Mars"];
const KP_TONES = ["quiet", "active", "peak"] as const;

/** Twelve months from September 2026: the report year crosses into 2027. */
const KP_MONTHS = KP_LORDS.map((ad, index) => {
  const start = new Date(Date.UTC(2026, 8 + index, 14));
  const end = new Date(Date.UTC(2026, 9 + index, 14));
  return {
    index,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    mid: start.toISOString().slice(0, 10),
    dasha: { md: "Saturn", ad, pd: "Venus" },
    tones: Object.fromEntries(KP_AREAS.map((k, j) => [k, KP_TONES[(index + j) % 3]])),
    focus: KP_AREAS[index % KP_AREAS.length],
    care: null,
    transits: [],
  };
});

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

const KP_SCORES = {
  engine: { ruleset: "KP", ayanamsa: "krishnamurti", houseSystem: "placidus", highLatitude: false, dashaYearDays: 365.25 },
  window: { start: "2026-09-14", end: "2027-09-14" },
  ascendant: { sign: "Libra", nakshatra: "Swati", starLord: "Rahu", subLord: "Jupiter" },
  moon: { sign: "Taurus", nakshatra: "Rohini", starLord: "Moon", subLord: "Mars" },
  cusps: SIGNS.map((sign, i) => ({
    house: i + 1,
    sign,
    nakshatra: "Purva Bhadrapada",
    starLord: GRAHAS[i % 9],
    subLord: GRAHAS[(i + 4) % 9],
  })),
  planets: GRAHAS.map((planet, i) => ({
    planet,
    sign: SIGNS[i],
    nakshatra: "Uttara Phalguni",
    starLord: GRAHAS[(i + 2) % 9],
    subLord: GRAHAS[(i + 5) % 9],
    house: i + 1,
    retrograde: planet === "Jupiter",
    signifies: [1, 2, 5, 7, 10, 11],
  })),
  sensitiveCusps: [5, 10],
  areas: KP_AREAS.map((key, i) => ({
    key,
    principalCusp: [10, 11, 7, 5, 6][i],
    cuspSubLord: GRAHAS[i + 2],
    promise: (["strong", "steady", "slow", "slow", "steady"] as const)[i],
    cuspNearBoundary: i === 3,
    peakMonths: [7, 8],
    activeMonths: [6, 7, 8, 9],
    bestWindow: i === 4 ? null : { start: "2027-04-26", end: "2027-09-26", lords: ["Mars"] },
  })),
  months: KP_MONTHS,
  dashaNow: { md: "Saturn", ad: "Moon", pd: "Venus", adEnds: "2027-04-12" },
  dashaShifts: [{ date: "2027-04-12", ad: "Mars", md: "Saturn" }],
  rulingPlanets: [{ planet: "Venus" }, { planet: "Moon" }, { planet: "Saturn" }],
  questions: [],
};

export const REPORT_FIXTURES: Record<string, ReportFixture> = {
  marriage: report(
    "marriage",
    {
      marriageScore: 71,
      band: "good",
      manglik: false,
      seventhLord: "Mars",
      seventhLordStrength: "strong",
      venusStrength: "moderate",
      venusHouse: 9,
      jupiterStrength: "strong",
      jupiterHouse: 11,
      seventhHouseSign: "Aries",
      seventhHouseTemperament: LONG,
      relationshipStatus: "single",
      windows: WINDOWS,
      ageBands: AGE_BANDS,
      doshaYoga: DOSHA_YOGA,
      partnerArchetype: ARCHETYPE,
      marriageQualityArc: DECADE_ARC,
      planetRemedies: PLANET_REMEDIES,
    },
    ["at_a_glance", "timing", "partner", "home_life", "money_after_marriage"],
    "2026-10-01",
  ),
  past_life: report(
    "past_life",
    { rahuHouse: 1, ketuHouse: 7, rahuSign: "Libra", ketuSign: "Aries", twelfthLordStrength: "strong", lifeSoFar: DECADE_ARC, doshaYoga: DOSHA_YOGA },
    ["karmic_pattern", "karmic_axis_theme", "unfinished_business_soul_lesson", "life_so_far"],
  ),
  kundli_milan: report(
    "kundli_milan",
    { ...MILAN_SCORES, planetRemedies: PLANET_REMEDIES },
    ["guna_milan_score_meaning", "dashakoota_deep_dive", "manglik_compatibility", "chart_additional_facts", "overall_recommendation"],
  ),
  true_love: report(
    "true_love",
    { loveScore: 68, band: "good", windows: WINDOWS, archetype: ARCHETYPE, romanceArc: DECADE_ARC, doshaYoga: DOSHA_YOGA, planetRemedies: PLANET_REMEDIES },
    ["what_this_means_for_you", "family_blessing", "timing_windows", "romantic_archetype", "blessings_cautions"],
    "2026-10-01",
  ),
  wealth: report(
    "wealth",
    { wealthScore: 74, band: "good", windows: WINDOWS, moneyArchetype: ARCHETYPE, wealthArc: DECADE_ARC, doshaYoga: DOSHA_YOGA, planetRemedies: PLANET_REMEDIES },
    ["at_a_glance", "income_paths", "guard_against", "timing"],
    "2026-10-01",
  ),
  baby_name: report(
    "baby_name",
    { moonNakshatra: "Rohini", nakshatraPada: 2, startingSyllables: ["Va", "Vi", "Vu", "O"], moonSign: "Taurus" },
    ["nakshatra_meaning", "suggested_names", "naming_guidance"],
  ),
  health_monthly: report("health_monthly", { ...MONTHLY, connectedHouses: [6, 8] }, ["this_months_outlook", "health_balance_this_month", "practical_guidance"], "2026-10-01"),
  career_monthly: report(
    "career_monthly",
    { ...MONTHLY, workArchetype: ARCHETYPE, industries: ["Finance", "Teaching", "Public administration"] },
    ["this_months_outlook", "your_work_style", "support_obstacles_this_month", "industries_that_fit"],
    "2026-10-01",
  ),
  finance_monthly: report("finance_monthly", MONTHLY, ["this_months_outlook", "dosha_yoga_check", "practical_guidance"], "2026-10-01"),
  relationship_monthly: report(
    "relationship_monthly",
    { ...MONTHLY, relationshipStatus: "in_relationship" },
    ["this_months_outlook", "practical_guidance", "blessings_cautions", "friction_reconciliation_dating_timing"],
    "2026-10-01",
  ),
  match_report: report("match_report", { ...MILAN_SCORES, planetRemedies: [] }, [
    "wealth", "health", "children", "harmony", "career", "timing", "intimacy", "inlaws", "dos", "donts", "remedies",
  ]),
  numerology: report(
    "numerology",
    {
      name: "Asha Venkataraghavan",
      dob: "1992-07-21",
      mulank: 3,
      bhagyank: 4,
      lifePath: 4,
      expression: 7,
      soulUrge: 2,
      personality: 5,
      luckyNumbers: [3, 6, 9],
      personalYear: 8,
      personalMonth: 9,
      monthlyForecast: Array.from({ length: 12 }, (_, i) => ({
        month: ["October", "November", "December", "January", "February", "March", "April", "May", "June", "July", "August", "September"][i],
        calendarMonth: ((9 + i) % 12) + 1,
        year: i < 3 ? 2026 : 2027,
        personalMonth: ((i + 8) % 9) + 1,
        personalYear: i < 3 ? 8 : 9,
      })),
      yearlyForecast: [2026, 2027, 2028, 2029, 2030].map((year, i) => ({ year, personalYear: ((7 + i) % 9) + 1 })),
      loShuGrid: { frequencies: { 1: 2, 2: 2, 7: 1, 9: 2 }, missing: [3, 4, 5, 6, 8], cells: [[4, 9, 2], [3, 5, 7], [8, 1, 6]] },
      challengeNumbers: {
        first: 2, second: 1, main: 1, fourth: 3,
        phases: [
          { phase: 1, ageRange: "0–32", challenge: 2 },
          { phase: 2, ageRange: "33–41", challenge: 1 },
        ],
      },
      namePlanes: { knowledge: 5, strength: 4, emotional: 7, spiritual: 3, letters: { knowledge: ["A", "H"], strength: ["S"], emotional: ["A"], spiritual: ["V"] } },
    },
    ["core_numbers", "expression_soul_urge_personality", "name_supports_numbers", "loshu_grid_name_planes", "challenge_numbers_kua_element", "this_year_this_month", "twelve_month_forecast", "luckiest_days_colors_years"],
    "2026-10-01",
  ),
  name_change: {
    ...report(
      "name_change",
      {
        currentName: "Asha Venkataraghavan",
        dob: "1992-07-21",
        missingInputs: [],
        gender: "female",
        alignment: {
          mulank: 3,
          bhagyank: 4,
          pythagorean: 7,
          chaldean: 5,
          soulUrge: 2,
          personality: 5,
          targets: [3, 6, 9],
          alignment: "neutral",
          friendly: [3, 6, 9],
          enemy: [5, 8],
        },
        variants: [{ variant: "Aasha Venkataraghavan", chaldean: 6, change: 'added "a" after the first letter' }],
      },
      ["numerological_signature", "name_change_benefits", "suggested_spelling_adjustments", "suggested_names", "practical_guidance"],
    ),
  },
  remedies: report(
    "remedies",
    {
      planetRemedies: PLANET_REMEDIES,
      presentDebts: [
        {
          type: "Pitra Rin (ancestral debt)",
          indicators: ["Venus, Mercury or Rahu placed in the 2nd, 5th, 9th or 12th house."],
          remedies: ["Collect equal coins from every family member and donate them at a temple the same day."],
        },
      ],
      pakkaGharPlacements: [{ planet: "Saturn", pakkaGhar: 10, currentHouse: 10, effect: "Saturn in its own permanent house steadies career and reputation." }],
      blindPlanets: [{ planet: "Mercury", house: 12, isBlind: false, isHalfBlind: true, reason: "Mercury sits in the 12th with no planet in the 6th to see it." }],
    },
    ["karmic_debts", "planet_remedies", "strengths_cautions", "how_to_use_remedies"],
  ),
  progeny: report(
    "progeny",
    { fifthLord: "Saturn", fifthLordStrength: "moderate", jupiterStrength: "strong", windows: WINDOWS, doshaYoga: DOSHA_YOGA },
    ["at_a_glance", "timing", "guidance"],
    "2026-10-01",
  ),
  kp_annual: report("kp_annual", KP_SCORES, [
    "year_at_a_glance", "kp_blueprint", "dasha_story", "transit_triggers", "career_money", "love_family",
    "health_wellbeing", "home_travel_learning", "month_by_month", "guidance_remedies", "closing_note",
  ]),
};

// The two name_change sections that list names carry cards, as the backend sends them.
REPORT_FIXTURES.name_change.sections[2].items = [
  { title: "Aasha Venkataraghavan", note: 'Added "a" after the first letter', badge: "Name number 6", highlight: true, bullets: ["Lands on 6, a friend of your birth number 3."] },
  { title: "Asha Venkataraghavann", note: 'Added "n" at the end', badge: "Name number 3", bullets: ["Matches your birth number."] },
];
REPORT_FIXTURES.name_change.sections[3].items = [
  { title: "Ashwini", badge: "Name number 9", bullets: ["A classical nakshatra name."] },
];

export const REPORT_KEYS = Object.keys(REPORT_FIXTURES);
