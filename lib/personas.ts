import type { ChatPersona } from "@/lib/swarm-api";

export interface Persona {
  key: ChatPersona;
  avatar: string;
  nameKey: string;
  specialtyKey: string;
  rating: number;
}

/**
 * Visual persona presentation — the 4 keys are the same functional personas
 * the backend has always had (general/career/love/health topic grounding).
 * Naming/avatars/ratings give each one an identity to show in the UI; they
 * don't change what's sent to the API. Ratings are cosmetic (no backend).
 */
export const PERSONAS: Persona[] = [
  { key: "general", avatar: "🧙", nameKey: "aiChatPage.personaGeneral", specialtyKey: "aiChatPage.personaGeneralSpecialty", rating: 4.9 },
  { key: "career", avatar: "💼", nameKey: "aiChatPage.personaCareer", specialtyKey: "aiChatPage.personaCareerSpecialty", rating: 4.8 },
  { key: "love", avatar: "🌸", nameKey: "aiChatPage.personaLove", specialtyKey: "aiChatPage.personaLoveSpecialty", rating: 4.9 },
  { key: "health", avatar: "🌿", nameKey: "aiChatPage.personaHealth", specialtyKey: "aiChatPage.personaHealthSpecialty", rating: 5.0 },
];
