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

export async function GET(req: NextRequest) {
  if (isRateLimited(`places-search:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json([], { status: 429 });
  }

  const input = req.nextUrl.searchParams.get('input')?.trim();
  if (!input || input.length < 2) return NextResponse.json([]);

  const isPincode = /^\d{6}$/.test(input);
  const url = isPincode
    ? `https://api.postalpincode.in/pincode/${input}`
    : `https://api.postalpincode.in/postoffice/${encodeURIComponent(input)}`;

  try {
    const res = await fetch(url);
    const data: IndiaPostResponse[] = await res.json();

    if (!data[0] || data[0].Status !== 'Success' || !data[0].PostOffice) {
      return NextResponse.json([]);
    }

    const seen = new Set<string>();
    const results = data[0].PostOffice
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
