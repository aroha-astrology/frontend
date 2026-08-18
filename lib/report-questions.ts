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
    { id: "concern", type: "text", labelKey: "reports.questions.career_monthly.concern" },
  ],
  finance_monthly: [
    { id: "concern", type: "text", labelKey: "reports.questions.finance_monthly.concern" },
  ],
  relationship_monthly: [
    { id: "concern", type: "text", labelKey: "reports.questions.relationship_monthly.concern" },
  ],
  // Entirely skippable, unlike every question above: numerology already reads the account's
  // own phone number (users.phone_e164) for its phone-numerology section, so this exists only
  // to let a reader without a phone on file — or who wants to check a different number —
  // override it. See jyotish-backend's resolvePhone (astro-engine/reports/numerology.ts).
  numerology: [{ id: "phoneNumber", type: "text", labelKey: "reports.questions.numerology.phoneNumber" }],
};
