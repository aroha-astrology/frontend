export type Topic = "career" | "marriage" | "finance" | "health" | "gemstone" | "default";

export const aiResponses: Record<Topic, string[]> = {
  career: [
    "According to Vedic astrology, Jupiter's current transit through your 10th house strongly indicates professional advancement. The next three months hold exceptional opportunities — be prepared to act decisively when they arise.",
    "Your chart shows Saturn making a powerful aspect to your Midheaven. This period demands discipline and persistence, but the rewards will be lasting. A senior figure in your field may open unexpected doors.",
    "Mars in your 6th house ignites ambition and work ethic. New skills acquired now will position you ahead of your peers within a year. Avoid conflict with colleagues during this transit.",
  ],
  marriage: [
    "Venus and Jupiter forming a trine in your 7th house creates a profoundly auspicious period for partnerships. If you are seeking a life partner, the coming months are cosmically favoured for that sacred union.",
    "The Moon's Nodes activate your relationship axis, suggesting a fated encounter or deepening of an existing bond. Trust what feels destined — it often is.",
    "Your Navamsha chart reveals a devoted and spiritually aligned partner in your destiny. Patience is key; what is written in the stars unfolds in divine timing.",
  ],
  finance: [
    "Jupiter, the planet of abundance, aspects your 2nd house of wealth. This is an auspicious window for investments and financial planning. Avoid speculative ventures; steady and disciplined growth is favoured.",
    "The current Dasha period activates your Dhana Yoga — a powerful wealth combination in your chart. Channel your energy into building long-term financial security rather than quick gains.",
    "Saturn's influence on your 11th house of income suggests that structured effort and consistency will multiply your earnings. A side venture started now could become a significant income source.",
  ],
  health: [
    "The Sun's position strengthens your vitality, but Mars may cause scattered energy. Prioritise sleep, hydration, and avoiding overexertion during this transit for optimal well-being.",
    "Reciting the Mahamrityunjaya Mantra and incorporating a morning routine aligned with your rising sign will significantly elevate your physical and mental health this season.",
    "Your chart highlights the importance of digestive health. Favour warm, nourishing foods and reduce cold or processed items. A sattvic diet will harmonise your body with the planetary energies.",
  ],
  gemstone: [
    "Based on the position of Jupiter in your chart, Yellow Sapphire (Pukhraj) set in gold and worn on the index finger of your right hand on a Thursday would amplify your prosperity and wisdom.",
    "Your Lagna lord indicates that Blue Sapphire (Neelam) may be highly beneficial — but only after a trial period. Wear it on a Saturday on the middle finger in silver to harness Saturn's discipline.",
    "Pearl (Moti) worn in silver on your little finger on a Monday will strengthen your Moon, enhancing emotional clarity, intuition, and peace of mind.",
  ],
  default: [
    "Namaste 🙏 The stars speak of transformation and growth in your journey ahead. Every planetary alignment serves a higher purpose in the grand tapestry of your karma.",
    "According to Vedic wisdom, every challenge you face is a precise lesson written by the cosmos. Your birth chart reveals the unique gifts and tests that shape your dharma.",
    "The celestial bodies are always in conversation with your soul. Ask me about career, marriage, finance, health, or your lucky gemstone for a personalised reading.",
    "Jupiter's wisdom shines upon those who seek the truth within. Your question carries the energy of sincere inquiry — the universe always answers those who ask with an open heart.",
  ],
};

export function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  let topic: Topic = "default";

  if (/career|job|work|business|profession|promotion/.test(lower)) topic = "career";
  else if (/marriage|love|partner|relationship|wedding|spouse/.test(lower)) topic = "marriage";
  else if (/finance|money|wealth|investment|income|rich|salary/.test(lower)) topic = "finance";
  else if (/health|sick|disease|body|energy|vitality|illness/.test(lower)) topic = "health";
  else if (/gemstone|gem|stone|crystal|ruby|sapphire|pearl/.test(lower)) topic = "gemstone";

  const responses = aiResponses[topic];
  return responses[Math.floor(responses.length * (input.length % responses.length) / responses.length)];
}
