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

export async function GET(req: NextRequest) {
  if (isRateLimited(`places-search:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json([], { status: 429 });
  }

  const input = req.nextUrl.searchParams.get('input')?.trim();
  if (!input || input.length < 2) return NextResponse.json([]);

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
