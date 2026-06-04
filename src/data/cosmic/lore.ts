import type { LoreArticle } from './types';

export const LORE_ARTICLES: LoreArticle[] = [
  {
    slug: 'understanding-sade-sati',
    title: 'Understanding Sade Sati',
    category: 'Doshas',
    excerpt: "Saturn's 7.5-year transit over your natal Moon — the most transformative period in Vedic astrology. What it really means and how to work with it.",
    icon: '♄',
    heroPlanet: 'Saturn',
    readMinutes: 6,
    sections: [
      {
        heading: 'What is Sade Sati?',
        body: "Sade Sati literally means 'seven and a half' in Sanskrit. It refers to the 7.5-year period during which Saturn transits through three consecutive signs — the sign before your Moon sign, your natal Moon sign, and the sign after it. Since Saturn spends approximately 2.5 years in each zodiac sign, the total transit covers this 7.5-year span.",
      },
      {
        heading: 'The Three Phases',
        body: "The Rising Phase begins when Saturn enters the sign before your Moon — the effects are subtle, primarily felt in the home environment, relationships with parents, and inner emotional world. The Peak Phase occurs when Saturn transits directly over your natal Moon — this is the most intense period, often bringing major life restructuring, health challenges, or career transitions. The Setting Phase as Saturn moves past your Moon brings gradual relief and integration of lessons learned.",
      },
      {
        heading: 'What Does It Actually Mean?',
        body: "Sade Sati is not a curse — it is Saturn doing its job. Saturn represents karma, discipline, and authentic effort. When it transits your Moon (the mind), it forces you to confront illusions, release attachments, and build genuine foundations. Many people experience their greatest professional breakthroughs, spiritual awakenings, or life course corrections during Sade Sati.",
      },
      {
        heading: 'Working With Sade Sati',
        body: "Consistent practice is the antidote to Sade Sati's pressure. Regular exercise, disciplined sleep, honest work, and service to others all strengthen Saturn's positive expression. Worship of Lord Shani on Saturdays, lighting sesame oil lamps, and reciting the Shani Stotra are traditional remedies. Most importantly — do not resist the changes Sade Sati initiates. Resistance amplifies suffering; acceptance and effort ease it.",
      },
    ],
    cta: { label: 'Check Your Sade Sati Status', href: '/gochar' },
    relatedSlugs: ['what-is-mangal-dosha', 'vimshottari-dasha-system'],
  },
  {
    slug: 'what-is-mangal-dosha',
    title: 'What is Mangal Dosha?',
    category: 'Doshas',
    excerpt: 'Mars placed in the 1st, 2nd, 4th, 7th, 8th, or 12th house creates Mangal Dosha. Understand what this means for relationships and marriage.',
    icon: '♂',
    heroPlanet: 'Mars',
    readMinutes: 5,
    sections: [
      {
        heading: 'The Meaning of Mangal Dosha',
        body: "Mangal Dosha (also called Kuja Dosha) arises when Mars occupies specific houses in the birth chart — traditionally the 1st, 2nd, 4th, 7th, 8th, or 12th houses. Mars is a fiery planet of energy, drive, and conflict. When placed in houses related to marriage and partnerships, it can introduce friction, impatience, or incompatibility in close relationships.",
      },
      {
        heading: 'How Serious Is It?',
        body: "Much depends on the severity. A full Mangal Dosha (Mars in the 7th or 8th house) is considered more intense than a partial one (Mars in the 1st, 2nd, 4th, or 12th). Additionally, several cancellation conditions apply — if Mars is in its own sign, exaltation sign, or if Jupiter aspects Mars, the dosha is significantly mitigated. Many Mangalik individuals live excellent married lives when matched with another Mangalik or a chart with appropriate Jupiter strength.",
      },
      {
        heading: 'Cancellation Conditions',
        body: "Mangal Dosha is cancelled when Mars is in Aries or Scorpio (own signs), Capricorn (exaltation), or Cancer (some texts). It is also cancelled if Mars is in the 1st house for Aries or Scorpio ascendants, or in the 8th house for Cancer ascendants. Jupiter's aspect on Mars or the 7th house lord being strong also neutralises the dosha substantially.",
      },
      {
        heading: 'Remedies and Guidance',
        body: "Traditional remedies include the Mangal Shanti puja, recitation of the Mangal mantra 10,000 times, wearing red coral after consultation with a qualified astrologer, and marrying after the age of 28 (when Mars matures). Most importantly — consult a knowledgeable Jyotishi before marriage matching, as the complete picture of both charts matters far more than a single placement.",
      },
    ],
    cta: { label: 'Check Your Chart', href: '/kundli' },
    relatedSlugs: ['understanding-sade-sati', 'navagraha-overview'],
  },
  {
    slug: 'the-27-nakshatras',
    title: 'The 27 Nakshatras',
    category: 'Nakshatras',
    excerpt: "The Moon's 27 lunar mansions — ancient star clusters that reveal personality, purpose, and destiny with remarkable precision.",
    icon: '✦',
    heroPlanet: 'Moon',
    readMinutes: 8,
    sections: [
      {
        heading: 'What Are Nakshatras?',
        body: "The 27 Nakshatras (lunar mansions) are the foundational framework of Vedic astrology. Each nakshatra spans 13°20' of the zodiac, and the 27 together cover all 360°. Where your Moon falls at birth determines your Janma Nakshatra (birth star) — considered even more significant than your Sun sign or Moon sign in Jyotish.",
      },
      {
        heading: 'Structure and Rulership',
        body: "Each nakshatra has a ruling planet (its lord), a symbol, a deity, a gana (temperament: Deva/Manushya/Rakshasa), and a yoni (animal nature). The Vimshottari Dasha system — the planetary period system used to time life events — is based entirely on the nakshatra of the natal Moon. The nakshatra lord at birth determines which Mahadasha period you begin life in.",
      },
      {
        heading: 'The Four Padas',
        body: "Each nakshatra is divided into four padas (quarters) of 3°20' each. The pada your Moon occupies corresponds to one of the four aims of life (dharma, artha, kama, moksha) and aligns with a specific navamsha sign, adding another layer of interpretation. Navamsha (D9 chart) analysis becomes critical for understanding the quality and depth of a nakshatra's influence.",
      },
      {
        heading: 'Notable Nakshatras',
        body: "Rohini (Moon's exaltation, ruled by Moon) — beauty, creativity, and abundance. Magha (ruled by Ketu) — royalty, ancestry, authority. Ardra (ruled by Rahu) — transformation through storms and upheaval. Jyeshtha (ruled by Mercury) — leadership, protection, eldest-sibling energy. Mula (ruled by Ketu) — uprooting, investigation, deep knowledge. Each nakshatra carries an entire mythological ecosystem that illuminates its meaning.",
      },
    ],
    cta: { label: 'Find Your Nakshatra', href: '/kundli/generate' },
    relatedSlugs: ['vimshottari-dasha-system', 'navagraha-overview'],
  },
  {
    slug: 'vimshottari-dasha-system',
    title: 'Vimshottari Dasha System',
    category: 'Dashas',
    excerpt: 'The 120-year planetary period cycle — the single most powerful timing tool in Vedic astrology. How to read your current Dasha and what it means.',
    icon: '◎',
    heroPlanet: 'Sun',
    readMinutes: 7,
    sections: [
      {
        heading: 'The Dasha Cycle',
        body: "Vimshottari Dasha is a 120-year planetary period system. The nine planets each rule a period ranging from 6 years (Sun) to 20 years (Venus), totalling 120 years. The sequence is: Ketu (7y) → Venus (20y) → Sun (6y) → Moon (10y) → Mars (7y) → Rahu (18y) → Jupiter (16y) → Saturn (19y) → Mercury (17y). Your natal Moon's nakshatra determines where in this cycle you begin at birth.",
      },
      {
        heading: 'Mahadasha, Antardasha, Pratyantardasha',
        body: "Within each Mahadasha (major period), there are nine Antardashas (sub-periods) — one for each planet, proportional in length to the overall dasha sequence. Within each Antardasha, there are further Pratyantardashas (sub-sub-periods). This creates an extraordinarily precise timing system. Events typically manifest most strongly when the Mahadasha and Antardasha lords are connected in the natal chart — through conjunction, mutual aspect, or sign exchange.",
      },
      {
        heading: 'Reading Your Current Dasha',
        body: "The Mahadasha lord sets the overarching theme for its entire duration. A well-placed Mahadasha lord (exalted, in own sign, or aspected by benefics) delivers its significations — career success, spiritual development, relationship fulfilment. A weakly placed or afflicted Mahadasha lord tends toward its negative significations — losses, health challenges, obstacles. The Antardasha lord refines and colours the period with its own qualities, for better or worse.",
      },
      {
        heading: 'Practical Use',
        body: "Use the Dasha sequence to time major decisions. Starting a business during a strong Mercury or Venus Mahadasha, for instance, aligns with those planets' natural significations. Marriage tends to manifest during the Venus, Moon, or 7th-lord Mahadasha/Antardasha. Career rises often coincide with Sun, Saturn, or 10th-lord periods. The Dasha system makes Jyotish a practical tool for life planning, not just description.",
      },
    ],
    cta: { label: 'View Your Dasha Timeline', href: '/kundli' },
    relatedSlugs: ['the-27-nakshatras', 'navagraha-overview'],
  },
  {
    slug: 'navagraha-overview',
    title: 'The Nine Grahas (Navagraha)',
    category: 'Grahas',
    excerpt: 'Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu — the nine cosmic intelligences that orchestrate the human experience in Jyotish.',
    icon: '☉',
    heroPlanet: 'Jupiter',
    readMinutes: 6,
    sections: [
      {
        heading: 'What is a Graha?',
        body: "The Sanskrit word Graha means 'that which seizes or grasps.' The nine Grahas are not merely astronomical bodies — in Jyotish they are cosmic intelligences, each expressing a distinct quality of consciousness. The Sun and Moon are luminaries; Mars, Mercury, Jupiter, Venus, and Saturn are the five visible planets; Rahu and Ketu are the two lunar nodes — mathematical points where the Moon's orbit crosses the ecliptic.",
      },
      {
        heading: 'Natural Benefics and Malefics',
        body: "Jupiter and Venus are natural benefics (shubha grahas) — they tend toward expansion, grace, and harmony. Mercury is a conditional benefic. Sun, Moon, Mars, and Saturn are natural malefics (krura grahas) by nature, though the Moon in bright fortnight and Sun as the soul's light have dual roles. Rahu and Ketu are the most unpredictable — they amplify whatever they touch, for better or worse.",
      },
      {
        heading: 'Planetary Relationships',
        body: "Each graha has natural friends, enemies, and neutrals based on classical Vedic texts. Sun and Moon, for instance, are mutual friends. Saturn and Sun are natural enemies (ego vs. discipline). These natural relationships are modified by the actual chart — a planet in the 6th, 8th, or 12th from another creates a temporary enmity. Both natural and temporal relationships must be assessed for accurate chart reading.",
      },
      {
        heading: 'Rahu and Ketu',
        body: "The shadow planets are axial — always exactly opposite each other. Rahu represents worldly desire, foreign influence, and the insatiable hunger of the material mind. Ketu represents detachment, past-life residue, and the pull toward liberation. Together they create the Kaal Sarp axis when all other planets fall between them — one of the most discussed configurations in Indian astrology. They move retrograde always and complete the zodiac in approximately 18 years.",
      },
    ],
    cta: { label: 'Explore the Grahas', href: '/explorer' },
    relatedSlugs: ['vimshottari-dasha-system', 'the-27-nakshatras'],
  },
  {
    slug: 'gajakesari-yoga',
    title: 'Gajakesari Yoga',
    category: 'Yogas',
    excerpt: "When Jupiter and Moon are in mutual kendra positions, one of Jyotish's most celebrated wealth and wisdom yogas is formed. What it truly delivers.",
    icon: '★',
    heroPlanet: 'Jupiter',
    readMinutes: 4,
    sections: [
      {
        heading: 'Formation of Gajakesari',
        body: "Gajakesari Yoga (literally 'elephant-lion yoga') forms when Jupiter is in the 1st, 4th, 7th, or 10th house from the natal Moon (or vice versa). The word combines 'Gaja' (elephant — associated with intelligence and royalty) and 'Kesari' (lion — power and authority). The combination symbolises wisdom-powered authority.",
      },
      {
        heading: 'What It Bestows',
        body: "Classical texts describe Gajakesari natives as learned, eloquent, wealthy, and respected by society. They tend to accumulate conveyances, attain positions of authority, and live with strong moral foundations. The yoga particularly strengthens during Jupiter and Moon Dashas, and when either planet transits over the other's natal position.",
      },
      {
        heading: 'Quality Matters',
        body: "Not all Gajakesari Yogas are equal. The strength of the yoga depends on: (1) the strength of Jupiter and Moon individually — exalted or in own signs is ideal, debilitated weakens it; (2) whether the yoga occurs in an angular house from the ascendant as well; (3) freedom from malefic aspects on Jupiter or Moon. A Gajakesari where both planets are strong and unafflicted can be among the most powerful yoga formations in a chart.",
      },
    ],
    cta: { label: 'Check Your Yogas', href: '/kundli' },
    relatedSlugs: ['navagraha-overview', 'vimshottari-dasha-system'],
  },
];

export function getLoreBySlug(slug: string): LoreArticle | undefined {
  return LORE_ARTICLES.find(a => a.slug === slug);
}

export function getRelated(slug: string): LoreArticle[] {
  const article = getLoreBySlug(slug);
  if (!article) return [];
  return article.relatedSlugs
    .map(s => getLoreBySlug(s))
    .filter((a): a is LoreArticle => !!a);
}
