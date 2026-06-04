import type { PlanetKey } from '@/components/3d/planet-registry';

export type { PlanetKey };

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo'
  | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type SeverityLevel = 'none' | 'mild' | 'moderate' | 'severe';
export type DashaLevel = 'mahadasha' | 'antardasha';

export interface GrahaInfo {
  key: PlanetKey;
  nameEn: string;
  nameSa: string;
  nameHi: string;
  signification: string;
  element: 'Fire' | 'Earth' | 'Air' | 'Water' | 'Ether';
  weekday: string;
  gemstone: string;
  metal: string;
  exaltationSign: ZodiacSign;
  debilitationSign: ZodiacSign;
  ownSigns: ZodiacSign[];
  friends: PlanetKey[];
  enemies: PlanetKey[];
  descriptor: string;
  deity: string;
  number: number;
}

export interface SadeSatiStatus {
  active: boolean;
  phase: 'rising' | 'peak' | 'setting' | 'none';
  severity: SeverityLevel;
  saturnSign: ZodiacSign;
  moonSign: ZodiacSign;
  startDate: string | null;
  endDate: string | null;
}

export interface MangalStatus {
  present: boolean;
  severity: SeverityLevel;
  type: 'partial' | 'full' | 'cancelled' | 'none';
}

export interface KaalSarpStatus {
  present: boolean;
  name: string;
  severity: SeverityLevel;
}

export interface YogaStatus {
  name: string;
  type: 'benefic' | 'dosha' | 'mahapurusha' | 'dhana' | 'raja' | 'lunar' | 'solar';
  present: boolean;
  strength: number;
  planets: PlanetKey[];
  description: string;
}

export interface DashaStatus {
  level: DashaLevel;
  planet: PlanetKey;
  startDate: string;
  endDate: string;
}

export interface BirthDetails {
  name: string;
  dob: string;
  tob: string;
  pob: string;
  lat: number;
  lng: number;
  timezone: string;
  gender: 'male' | 'female' | 'other';
}

export interface CosmicProfile {
  birth: BirthDetails;
  lagna: ZodiacSign;
  lagnaNakshatra: string;
  moonSign: ZodiacSign;
  nakshatra: string;
  currentMahadasha: DashaStatus;
  currentAntardasha: DashaStatus;
  sadeSati: SadeSatiStatus;
  mangal: MangalStatus;
  kaalSarp: KaalSarpStatus;
  yogas: YogaStatus[];
  narrative: string;
}

export interface LoreSection {
  heading: string;
  body: string;
}

export interface LoreArticle {
  slug: string;
  title: string;
  category: 'Doshas' | 'Dashas' | 'Nakshatras' | 'Yogas' | 'Grahas' | 'Basics';
  excerpt: string;
  icon: string;
  heroPlanet: PlanetKey;
  readMinutes: number;
  sections: LoreSection[];
  cta?: { label: string; href: string };
  relatedSlugs: string[];
}
