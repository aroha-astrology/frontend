import type { CosmicProfile, SeverityLevel } from './types';
import type { PlanetKey } from '@/components/3d/planet-registry';

export const DEMO_PROFILE: CosmicProfile = {
  birth: {
    name: 'Arjun Sharma',
    dob: '1993-04-14',
    tob: '06:32',
    pob: 'Jaipur, Rajasthan',
    lat: 26.9124,
    lng: 75.7873,
    timezone: 'Asia/Kolkata',
    gender: 'male',
  },
  lagna: 'Aries',
  lagnaNakshatra: 'Ashwini',
  moonSign: 'Scorpio',
  nakshatra: 'Anuradha',
  currentMahadasha: {
    level: 'mahadasha',
    planet: 'Saturn',
    startDate: '2019-08-12',
    endDate: '2038-08-12',
  },
  currentAntardasha: {
    level: 'antardasha',
    planet: 'Rahu',
    startDate: '2024-11-01',
    endDate: '2027-09-15',
  },
  sadeSati: {
    active: true,
    phase: 'peak',
    severity: 'moderate',
    saturnSign: 'Scorpio',
    moonSign: 'Scorpio',
    startDate: '2023-01-17',
    endDate: '2025-09-02',
  },
  mangal: {
    present: true,
    severity: 'mild',
    type: 'partial',
  },
  kaalSarp: {
    present: false,
    name: '',
    severity: 'none',
  },
  yogas: [
    {
      name: 'Gajakesari Yoga',
      type: 'benefic',
      present: true,
      strength: 82,
      planets: ['Jupiter', 'Moon'],
      description: 'Jupiter in a kendra from Moon — blesses with wisdom, fame, and prosperity',
    },
    {
      name: 'Chandra Mangala Yoga',
      type: 'benefic',
      present: true,
      strength: 68,
      planets: ['Moon', 'Mars'],
      description: 'Moon and Mars conjunct or in mutual aspect — strong willpower and financial acumen',
    },
    {
      name: 'Mangal Dosha',
      type: 'dosha',
      present: true,
      strength: 40,
      planets: ['Mars'],
      description: 'Mars placed in 1st house — partial Mangal Dosha affecting relationship dynamics',
    },
  ],
  narrative:
    'Born under Aries ascendant with Moon in Scorpio, you carry the fierce vitality of Mars and the transformative depths of Scorpio. The current Saturn Mahadasha (2019–2038) is a long arc of karmic consolidation — demanding patience, discipline, and authentic effort. Rahu Antardasha (2024–2027) amplifies ambition and pushes you toward unfamiliar territory. The active Sade Sati is peaking now, a time of internal reckoning and outer restructuring. Gajakesari Yoga grants natural eloquence and leadership — your setbacks are instructive, not permanent.',
};

// Maps severity/type to Badge variant for UI chip rendering
export const STATUS_TONE: Record<SeverityLevel | 'none' | 'benefic' | 'raja' | 'dhana' | 'mahapurusha', 'success' | 'warning' | 'error' | 'default'> = {
  none: 'default',
  mild: 'warning',
  moderate: 'warning',
  severe: 'error',
  benefic: 'success',
  raja: 'success',
  dhana: 'success',
  mahapurusha: 'success',
};

export interface DestinyChip {
  label: string;
  value: string;
  planet?: PlanetKey;
  tone: 'success' | 'warning' | 'error' | 'default';
  icon?: string;
}

export function buildDestinyChips(profile: CosmicProfile): DestinyChip[] {
  const chips: DestinyChip[] = [
    {
      label: 'Lagna',
      value: profile.lagna,
      tone: 'default',
      icon: '⬡',
    },
    {
      label: 'Moon Sign',
      value: profile.moonSign,
      tone: 'default',
      icon: '☽',
    },
    {
      label: 'Nakshatra',
      value: profile.nakshatra,
      tone: 'default',
      icon: '✦',
    },
    {
      label: 'Mahadasha',
      value: `${profile.currentMahadasha.planet}`,
      planet: profile.currentMahadasha.planet,
      tone: 'default',
      icon: '◎',
    },
    {
      label: 'Antardasha',
      value: `${profile.currentAntardasha.planet}`,
      planet: profile.currentAntardasha.planet,
      tone: 'default',
      icon: '◉',
    },
  ];

  if (profile.sadeSati.active) {
    chips.push({
      label: 'Sade Sati',
      value: `Active (${profile.sadeSati.phase})`,
      planet: 'Saturn',
      tone: STATUS_TONE[profile.sadeSati.severity],
      icon: '♄',
    });
  }

  if (profile.mangal.present && profile.mangal.type !== 'cancelled') {
    chips.push({
      label: 'Mangal Dosha',
      value: profile.mangal.type === 'full' ? 'Full' : 'Partial',
      planet: 'Mars',
      tone: STATUS_TONE[profile.mangal.severity],
      icon: '♂',
    });
  }

  if (profile.kaalSarp.present) {
    chips.push({
      label: 'Kaal Sarp',
      value: profile.kaalSarp.name,
      tone: STATUS_TONE[profile.kaalSarp.severity],
      icon: '☊',
    });
  }

  for (const yoga of profile.yogas.filter(y => y.present && y.type !== 'dosha')) {
    chips.push({
      label: yoga.name,
      value: `${yoga.strength}% strength`,
      tone: STATUS_TONE[yoga.type as keyof typeof STATUS_TONE] ?? 'success',
      icon: '★',
    });
  }

  return chips;
}
