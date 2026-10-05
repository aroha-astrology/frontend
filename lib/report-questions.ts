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
  numerology: [{ id: "phoneNumber", type: "text", labelKey: "reports.questions.numerology.phoneNumber" }],
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
