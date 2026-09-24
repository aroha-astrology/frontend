/**
 * Canned API payloads for the E2E suite. Shapes mirror lib/api.ts types; keep
 * them minimal — a field only needs to be here if a screen under test reads it.
 */

export const LEGAL_VERSION = "1.3.0"; // lib/legal-content.ts — a mismatch shows ConsentGate

const ALL_TOURS = ["home", "kundli", "reports-list", "report-detail", "ai-chat", "horoscope", "panchang", "remedies", "vastu", "palm"];

export type E2EUser = Record<string, unknown>;

export function makeUser(over: Partial<E2EUser> = {}): E2EUser {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    firebaseUid: "e2e-user",
    phoneE164: "+919999900001",
    email: null,
    displayName: "Asha",
    gender: "female",
    dateOfBirth: "1992-07-21",
    timeOfBirth: "14:10",
    placeOfBirth: { name: "Delhi, India", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" },
    canEditBirthDetails: true,
    birthTimeAccuracy: "exact",
    canSetExactBirthTime: false,
    // Long ago — NewUserWelcomeModal only shows within 5 minutes of this.
    profileCompletedAt: "2026-01-01T00:00:00.000Z",
    notificationPrefs: null,
    quietHours: null,
    previouslyDeleted: false,
    deletionRequestedAt: null,
    dataProcessingConsentActive: true,
    relationshipStatus: "single",
    termsVersion: LEGAL_VERSION,
    walletBalancePaise: 50_000,
    nextReportVote: null,
    nextFreeFollowUpAt: null,
    unlockedHouses: [],
    gemstoneUnlocked: false,
    feedbackGiven: true,
    claimedCampaigns: [],
    toursCompleted: ALL_TOURS,
    activeClaimableCampaign: null,
    referralCode: "ASHA42",
    referredByCode: null,
    // Missing keys resolve as enabled (hooks/useFeature.ts), so only list what a test turns off.
    features: {},
    isAdmin: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const category = (score: number, hook: string) => ({
  hook,
  description: `${hook} — the Moon supports steady effort today.`,
  advice: "Take one small, concrete step.",
  quality: score >= 4 ? "good" : score === 3 ? "moderate" : "challenging",
  score,
});

export function makeHoroscope(period: string, overallScore = 4) {
  const overall = category(overallScore, "A clear, steady day");
  return {
    forDate: "2026-09-24",
    period,
    periodKey: "2026-09-24",
    summary: "A clear, steady day for focused work.",
    structured: {
      ...overall,
      luckyColor: "Gold",
      luckyNumber: 7,
      categories: {
        overall,
        health: category(3, "Rest well"),
        career: category(4, "Good for pitching ideas"),
        marriage: category(3, "Listen more than you speak"),
        finance: category(2, "Hold off on big purchases"),
        education: category(4, "Study sticks today"),
      },
    },
    model: "e2e",
    generatedAt: "2026-09-24T00:30:00.000Z",
  };
}

export function makeRewardState(over: { claimedToday?: boolean; currentDay?: number } = {}) {
  const currentDay = over.currentDay ?? 2;
  const claimedToday = over.claimedToday ?? true;
  return {
    currentDay,
    claimedToday,
    todayAmountPaise: 500 + (currentDay - 1) * 100,
    nextDayAmountPaise: 500 + currentDay * 100,
    expiresInDays: 30,
    ladder: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      amountPaise: 500 + i * 100 + (i === 6 ? 2100 : 0),
      isBonusDay: i === 6,
      claimed: i + 1 < currentDay || (i + 1 === currentDay && claimedToday),
    })),
  };
}

export const primaryProfile = {
  id: "primary",
  isPrimary: true,
  isActive: true,
  relationship: null,
  displayName: "Asha",
  gender: "female",
  dateOfBirth: "1992-07-21",
  timeOfBirth: "14:10",
  birthTimeAccuracy: "exact",
  placeOfBirth: { name: "Delhi, India", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" },
  createdAt: "2026-01-01T00:00:00.000Z",
};
