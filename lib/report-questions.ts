// =============================================================================
// Optional pre-purchase questionnaire per report type
// =============================================================================
// A small, entirely skippable set of questions shown in ReportPurchaseDrawer
// before a purchase, whose answers get passed straight through to the
// backend's report generation prompt (see PurchaseReportBody.answers) so the
// narrative is more personalized. A report key with no entry here (e.g.
// `marriage`) simply shows no question step — marriage's guidance is already
// personalized from the reader's own `relationshipStatus`, set during
// onboarding, so asking "are you married?" again here would be redundant.
// =============================================================================

export type ReportQuestionType = "select" | "text";

export interface ReportQuestionOption {
  value: string;
  /** i18n key for this option's label. */
  labelKey: string;
}

export interface ReportQuestion {
  id: string;
  type: ReportQuestionType;
  /** i18n key for the question's own label. */
  labelKey: string;
  /** `select` only. */
  options?: ReportQuestionOption[];
  /** Render this question only when another question in the same set has a given value —
   * e.g. baby_name's `childGender` only makes sense once `hasChild` is "yes". One level only,
   * no chained conditions needed for the question sets configured today. */
  showIf?: { questionId: string; value: string };
  /** Skipping this leaves the report no less personal, because it only overrides something the
   * account already holds (numerology's phone number). Such a question gets no "why we ask" note
   * and never triggers the general-report warning. */
  overridesAccount?: true;
  /** The reader cannot buy until this is answered (Varshik Rashifal: every answer is needed, nothing is guessed). */
  required?: true;
}

/** True when the reader is about to buy a report without answering any of the questions that
 * make it about their life, so the drawer should warn that the report will be general. One rule
 * for every report: a new report's questions get the warning without any change here. */
export function answeredNone(questions: ReportQuestion[], answers: Record<string, string>): boolean {
  if (!questions.some((q) => !q.overridesAccount)) return false;
  return !questions.some((q) => (answers[q.id] ?? "").trim() !== "");
}

/** The visible questions the reader has not answered yet but must: the Buy button stays shut until this is empty. */
export function missingRequired(questions: ReportQuestion[], answers: Record<string, string>): ReportQuestion[] {
  return questions.filter((q) => q.required && (answers[q.id] ?? "").trim() === "");
}

// ── Questions shared by more than one report ────────────────────────────────
// A chart shows which way a life leans; it cannot know the reader's job, income, relationship or
// children. Reports that guessed were wrong often enough to be called rubbish, so the ones that
// need to know now ask. Option values are read by jyotish-backend's readerSituationFromAnswers
// (astro-engine/reports/reader-situation.ts) — keep the two in step.

const INCOME_TODAY: ReportQuestion = {
  id: "incomeToday",
  type: "select",
  labelKey: "reports.questions.wealth.incomeToday",
  options: [
    { value: "salaried", labelKey: "reports.questions.wealth.incomeSalaried" },
    { value: "business", labelKey: "reports.questions.wealth.incomeBusiness" },
    { value: "self_employed", labelKey: "reports.questions.wealth.incomeSelfEmployed" },
    { value: "property", labelKey: "reports.questions.wealth.incomeProperty" },
    { value: "not_earning", labelKey: "reports.questions.wealth.incomeNotEarning" },
  ],
};

const WORK_NOW: ReportQuestion = {
  id: "workNow",
  type: "select",
  labelKey: "reports.questions.workNow.label",
  options: [
    { value: "job", labelKey: "reports.questions.workNow.job" },
    { value: "business", labelKey: "reports.questions.workNow.business" },
    { value: "self_employed", labelKey: "reports.questions.workNow.selfEmployed" },
    { value: "student", labelKey: "reports.questions.workNow.student" },
    { value: "not_working", labelKey: "reports.questions.workNow.notWorking" },
  ],
};

// The account's own relationship status is written once at sign-up and no screen can change it,
// so the reports that depend on it ask again here.
const RELATIONSHIP_NOW: ReportQuestion = {
  id: "relationshipNow",
  type: "select",
  labelKey: "reports.questions.relationshipNow.label",
  options: [
    { value: "single", labelKey: "reports.questions.relationshipNow.single" },
    { value: "in_relationship", labelKey: "reports.questions.relationshipNow.inRelationship" },
    { value: "married", labelKey: "reports.questions.relationshipNow.married" },
    { value: "previously_married", labelKey: "reports.questions.relationshipNow.previouslyMarried" },
  ],
};

const CHILDREN: ReportQuestion = {
  id: "children",
  type: "select",
  labelKey: "reports.questions.children.label",
  options: [
    { value: "none", labelKey: "reports.questions.children.none" },
    { value: "one", labelKey: "reports.questions.children.one" },
    { value: "two_or_more", labelKey: "reports.questions.children.twoOrMore" },
  ],
};

// Asked only when the profile has no male/female on file. Kua (numerology), the first-child
// house (progeny), the name pool (name_change) and the boy/girl order of Guna Milan
// (kundli_milan, marriage) each differ by gender, and none of them may guess it. The answer
// fills the gap for that purchase only (backend reports.service buildReportScoreContext).
// Skipping it never triggers the general-report warning, hence overridesAccount.
const READER_GENDER: ReportQuestion = {
  id: "readerGender",
  type: "select",
  labelKey: "reports.questions.readerGender.label",
  overridesAccount: true,
  options: [
    { value: "female", labelKey: "reports.questions.readerGender.female" },
    { value: "male", labelKey: "reports.questions.readerGender.male" },
  ],
};

const NEEDS_GENDER = new Set(["numerology", "name_change", "progeny", "kundli_milan", "marriage"]);

/** A report's questions, plus the gender question when its maths needs a gender the profile lacks. */
export function questionsFor(reportKey: string, profileGender: string | null | undefined): ReportQuestion[] {
  const base = REPORT_QUESTIONS[reportKey] ?? [];
  const known = profileGender === "male" || profileGender === "female";
  return NEEDS_GENDER.has(reportKey) && !known ? [...base, READER_GENDER] : base;
}

export const REPORT_QUESTIONS: Record<string, ReportQuestion[]> = {
  baby_name: [
    {
      id: "hasChild",
      type: "select",
      labelKey: "reports.questions.baby_name.hasChild",
      options: [
        { value: "yes", labelKey: "common.yes" },
        { value: "no", labelKey: "common.no" },
      ],
    },
    {
      id: "childGender",
      type: "select",
      labelKey: "reports.questions.baby_name.childGenderLabel",
      showIf: { questionId: "hasChild", value: "yes" },
      options: [
        { value: "girl", labelKey: "reports.questions.baby_name.childGenderGirl" },
        { value: "boy", labelKey: "reports.questions.baby_name.childGenderBoy" },
      ],
    },
    {
      id: "planningBaby",
      type: "select",
      labelKey: "reports.questions.baby_name.planningBaby",
      options: [
        { value: "yes", labelKey: "common.yes" },
        { value: "no", labelKey: "common.no" },
        { value: "not_sure", labelKey: "reports.questions.notSure" },
      ],
    },
    {
      id: "namePreference",
      type: "select",
      labelKey: "reports.questions.baby_name.namePreferenceLabel",
      options: [
        { value: "western", labelKey: "reports.questions.baby_name.namePreferenceWestern" },
        { value: "indian", labelKey: "reports.questions.baby_name.namePreferenceIndian" },
        { value: "ancient", labelKey: "reports.questions.baby_name.namePreferenceAncient" },
        { value: "other", labelKey: "reports.questions.baby_name.namePreferenceOther" },
      ],
    },
  ],
  health_monthly: [
    { id: "concern", type: "text", labelKey: "reports.questions.health_monthly.concern" },
  ],
  career_monthly: [
    WORK_NOW,
    { id: "concern", type: "text", labelKey: "reports.questions.career_monthly.concern" },
  ],
  finance_monthly: [
    INCOME_TODAY,
    { id: "concern", type: "text", labelKey: "reports.questions.finance_monthly.concern" },
  ],
  relationship_monthly: [
    RELATIONSHIP_NOW,
    { id: "concern", type: "text", labelKey: "reports.questions.relationship_monthly.concern" },
  ],
  // Entirely skippable, unlike every question above: numerology already reads the account's
  // own phone number (users.phone_e164) for its phone-numerology section, so this exists only
  // to let a reader without a phone on file — or who wants to check a different number —
  // override it. See jyotish-backend's resolvePhone (astro-engine/reports/numerology.ts).
  numerology: [
    { id: "phoneNumber", type: "text", labelKey: "reports.questions.numerology.phoneNumber", overridesAccount: true },
  ],
  true_love: [RELATIONSHIP_NOW],
  progeny: [CHILDREN],
  wealth: [
    INCOME_TODAY,
    {
      id: "ownsProperty",
      type: "select",
      labelKey: "reports.questions.wealth.ownsProperty",
      options: [
        { value: "yes", labelKey: "common.yes" },
        { value: "no", labelKey: "common.no" },
      ],
    },
    { id: "concern", type: "text", labelKey: "reports.questions.wealth.concern" },
  ],
  // Varshik Rashifal 2027. The ids and the option VALUES are read by the backend as they are:
  // jyotish-backend modules/reports/varshik-purchase.ts rejects anything else, the scorer's
  // decision table (config/varshik-weights.ts) and the text check for what the report may say
  // about a partner, children or work (lib/llm/reports/verify-varshik-text.ts) read the same
  // values. Keep the ten in step; every one is required.
  varshik_rashifal_2027: [
    {
      id: "relationship",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.relationship.label",
      options: [
        { value: "single", labelKey: "reports.questions.varshik_rashifal_2027.relationship.single" },
        { value: "partnered", labelKey: "reports.questions.varshik_rashifal_2027.relationship.partnered" },
        { value: "married", labelKey: "reports.questions.varshik_rashifal_2027.relationship.married" },
        { value: "previously_married", labelKey: "reports.questions.varshik_rashifal_2027.relationship.previouslyMarried" },
      ],
    },
    {
      id: "occupation",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.occupation.label",
      options: [
        { value: "student", labelKey: "reports.questions.varshik_rashifal_2027.occupation.student" },
        { value: "working", labelKey: "reports.questions.varshik_rashifal_2027.occupation.working" },
        { value: "business", labelKey: "reports.questions.varshik_rashifal_2027.occupation.business" },
        { value: "seeking_work", labelKey: "reports.questions.varshik_rashifal_2027.occupation.seekingWork" },
        { value: "homemaker", labelKey: "reports.questions.varshik_rashifal_2027.occupation.homemaker" },
        { value: "retired", labelKey: "reports.questions.varshik_rashifal_2027.occupation.retired" },
      ],
    },
    {
      id: "children",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.children.label",
      options: [
        { value: "none", labelKey: "reports.questions.varshik_rashifal_2027.children.none" },
        { value: "planning", labelKey: "reports.questions.varshik_rashifal_2027.children.planning" },
        { value: "have", labelKey: "reports.questions.varshik_rashifal_2027.children.have" },
      ],
    },
    {
      id: "mainDecision",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.mainDecision.label",
      options: [
        { value: "job_change", labelKey: "reports.questions.varshik_rashifal_2027.mainDecision.jobChange" },
        { value: "start_business", labelKey: "reports.questions.varshik_rashifal_2027.mainDecision.startBusiness" },
        { value: "relationship", labelKey: "reports.questions.varshik_rashifal_2027.mainDecision.relationship" },
        { value: "move_or_travel", labelKey: "reports.questions.varshik_rashifal_2027.mainDecision.moveOrTravel" },
        { value: "money", labelKey: "reports.questions.varshik_rashifal_2027.mainDecision.money" },
        { value: "health", labelKey: "reports.questions.varshik_rashifal_2027.mainDecision.health" },
        { value: "study", labelKey: "reports.questions.varshik_rashifal_2027.mainDecision.study" },
        { value: "nothing_specific", labelKey: "reports.questions.varshik_rashifal_2027.mainDecision.nothingSpecific" },
      ],
    },
    {
      id: "livingWith",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.livingWith.label",
      options: [
        { value: "alone", labelKey: "reports.questions.varshik_rashifal_2027.livingWith.alone" },
        { value: "partner", labelKey: "reports.questions.varshik_rashifal_2027.livingWith.partner" },
        { value: "parents", labelKey: "reports.questions.varshik_rashifal_2027.livingWith.parents" },
        { value: "joint_family", labelKey: "reports.questions.varshik_rashifal_2027.livingWith.jointFamily" },
        { value: "friends_or_others", labelKey: "reports.questions.varshik_rashifal_2027.livingWith.friendsOrOthers" },
      ],
    },
    {
      id: "home",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.home.label",
      options: [
        { value: "own", labelKey: "reports.questions.varshik_rashifal_2027.home.own" },
        { value: "rented", labelKey: "reports.questions.varshik_rashifal_2027.home.rented" },
        { value: "family_home", labelKey: "reports.questions.varshik_rashifal_2027.home.familyHome" },
        { value: "buying_or_building", labelKey: "reports.questions.varshik_rashifal_2027.home.buyingOrBuilding" },
      ],
    },
    {
      id: "moneyFocus",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.moneyFocus.label",
      options: [
        { value: "saving", labelKey: "reports.questions.varshik_rashifal_2027.moneyFocus.saving" },
        { value: "investing", labelKey: "reports.questions.varshik_rashifal_2027.moneyFocus.investing" },
        { value: "clearing_debt", labelKey: "reports.questions.varshik_rashifal_2027.moneyFocus.clearingDebt" },
        { value: "earning_more", labelKey: "reports.questions.varshik_rashifal_2027.moneyFocus.earningMore" },
        { value: "big_purchase", labelKey: "reports.questions.varshik_rashifal_2027.moneyFocus.bigPurchase" },
        { value: "nothing_specific", labelKey: "reports.questions.varshik_rashifal_2027.moneyFocus.nothingSpecific" },
      ],
    },
    {
      id: "travelPlan",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.travelPlan.label",
      options: [
        { value: "abroad", labelKey: "reports.questions.varshik_rashifal_2027.travelPlan.abroad" },
        { value: "within_india", labelKey: "reports.questions.varshik_rashifal_2027.travelPlan.withinIndia" },
        { value: "none", labelKey: "reports.questions.varshik_rashifal_2027.travelPlan.none" },
      ],
    },
    {
      id: "studyPlan",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.studyPlan.label",
      options: [
        { value: "exam", labelKey: "reports.questions.varshik_rashifal_2027.studyPlan.exam" },
        { value: "course", labelKey: "reports.questions.varshik_rashifal_2027.studyPlan.course" },
        { value: "none", labelKey: "reports.questions.varshik_rashifal_2027.studyPlan.none" },
      ],
    },
    {
      id: "practice",
      type: "select",
      required: true,
      labelKey: "reports.questions.varshik_rashifal_2027.practice.label",
      options: [
        { value: "daily", labelKey: "reports.questions.varshik_rashifal_2027.practice.daily" },
        { value: "sometimes", labelKey: "reports.questions.varshik_rashifal_2027.practice.sometimes" },
        { value: "never", labelKey: "reports.questions.varshik_rashifal_2027.practice.never" },
      ],
    },
  ],
  marriage: [
    {
      id: "isMarried",
      type: "select",
      labelKey: "reports.questions.marriage.isMarried",
      options: [
        { value: "yes", labelKey: "common.yes" },
        { value: "no", labelKey: "common.no" },
      ],
    },
  ],
};
