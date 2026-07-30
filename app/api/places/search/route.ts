import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited, clientIp } from '@/lib/rate-limit';

interface PostOffice {
  Name: string;
  District: string;
  State: string;
  Pincode: string;
}

interface IndiaPostResponse {
  Status: string;
  PostOffice: PostOffice[] | null;
}

// India Post's post-office names still use the pre-rename spelling for
// several circles — every Bangalore post office is literally named
// "... (Bangalore)"; none contain "Bengaluru" — so a name search for the
// modern/official city name returns zero matches even though the place
// obviously exists. Retry with the alternate name when the first search
// comes up empty.
const CITY_ALIASES: Record<string, string> = {
  bengaluru: 'bangalore', bangalore: 'bengaluru',
  mumbai: 'bombay', bombay: 'mumbai',
  kolkata: 'calcutta', calcutta: 'kolkata',
  chennai: 'madras', madras: 'chennai',
  thiruvananthapuram: 'trivandrum', trivandrum: 'thiruvananthapuram',
  kochi: 'cochin', cochin: 'kochi',
  puducherry: 'pondicherry', pondicherry: 'puducherry',
  vadodara: 'baroda', baroda: 'vadodara',
  mysuru: 'mysore', mysore: 'mysuru',
  prayagraj: 'allahabad', allahabad: 'prayagraj',
  gurugram: 'gurgaon', gurgaon: 'gurugram',
};

async function fetchPostOffices(term: string): Promise<PostOffice[]> {
  const isPincode = /^\d{6}$/.test(term);
  const url = isPincode
    ? `https://api.postalpincode.in/pincode/${term}`
    : `https://api.postalpincode.in/postoffice/${encodeURIComponent(term)}`;
  const res = await fetch(url);
  const data: IndiaPostResponse[] = await res.json();
  if (!data[0] || data[0].Status !== 'Success' || !data[0].PostOffice) return [];
  return data[0].PostOffice;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  hamlet?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  display_name: string;
  address?: NominatimAddress;
}

/** Worldwide city/town search for users who didn't sign in via phone (see
 * hooks/usePlaceAutocomplete.ts) — India Post only knows Indian post
 * offices, so a non-Indian birth place needs a real worldwide source.
 * No pincode concept applies globally, so suggestions never carry one. */
async function searchWorldwide(term: string) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: term,
    format: 'json',
    addressdetails: '1',
    limit: '8',
  })}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'ArohaAstrology/1.0' } });
  if (!res.ok) return [];
  const data: NominatimResult[] = await res.json();

  const seen = new Set<string>();
  return data
    .map((r) => {
      const a = r.address ?? {};
      const name = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet;
      // Filter out non-place results (roads, buildings, POIs) — a result
      // with no recognizable city/town-level address component isn't one.
      if (!name) return null;
      const id = `nom-${r.place_id}`;
      if (seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        name,
        district: a.county ?? '',
        state: a.state ?? '',
        pincode: '',
        country: a.country ?? '',
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        description: [name, a.state, a.country].filter(Boolean).join(', '),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .slice(0, 8);
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')?.trim();
  if (!input || input.length < 2) return NextResponse.json([]);

  const worldwide = req.nextUrl.searchParams.get('worldwide') === '1';

  if (worldwide) {
    // Nominatim's public instance asks for restrained request volume — cap
    // tighter than the India Post limiter below.
    if (isRateLimited(`places-search-worldwide:${clientIp(req)}`, 20, 60_000)) {
      return NextResponse.json([], { status: 429 });
    }
    try {
      return NextResponse.json(await searchWorldwide(input));
    } catch {
      return NextResponse.json([]);
    }
  }

  if (isRateLimited(`places-search:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json([], { status: 429 });
  }

  try {
    let postOffices = await fetchPostOffices(input);
    if (postOffices.length === 0) {
      const alias = CITY_ALIASES[input.toLowerCase()];
      if (alias) postOffices = await fetchPostOffices(alias);
    }
    if (postOffices.length === 0) return NextResponse.json([]);

    const seen = new Set<string>();
    const results = postOffices
      .map((po) => {
        const id = `${po.Name.trim()}-${po.District}-${po.Pincode}`;
        if (seen.has(id)) return null;
        seen.add(id);
        return {
          id,
          name: po.Name.trim(),
          district: po.District,
          state: po.State,
          pincode: po.Pincode,
          description: `${po.Name.trim()}, ${po.District}, ${po.State} - ${po.Pincode}`,
        };
      })
      .filter(Boolean)
      .slice(0, 10);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
