/**
 * The single AI astrologer's display identity. Chat used to offer 4 separate
 * personas (general/career/love/health) with different chart-fact slices and
 * system prompts; the backend is now one fully-grounded astrologer that can
 * answer anything, so there's nothing left to pick — this just reuses the
 * former "general" persona's copy (already the broadest, all-topics framing)
 * for the header/avatar/greeting, with zero new i18n keys needed.
 */
export const ASTROLOGER = {
  avatar: "🧙",
  nameKey: "aiChatPage.personaGeneral",
  specialtyKey: "aiChatPage.personaGeneralSpecialty",
};
