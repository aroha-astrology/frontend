import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited, clientIp } from '@/lib/rate-limit';

async function nominatimSearch(params: Record<string, string>) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    format: 'json',
    limit: '1',
    ...params,
  })}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'ArohaAstrology/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

export async function GET(req: NextRequest) {
  if (isRateLimited(`places-geocode:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json(null, { status: 429 });
  }

  const city = req.nextUrl.searchParams.get('city')?.trim();
  const state = req.nextUrl.searchParams.get('state')?.trim();
  const district = req.nextUrl.searchParams.get('district')?.trim();
  const pincode = req.nextUrl.searchParams.get('pincode')?.trim();

  if (!city) return NextResponse.json(null);

  // Small towns/villages (the majority of India Post's post offices) are
  // frequently absent from Nominatim's freeform address index — try
  // progressively looser/alternate queries before giving up. A "no result"
  // here otherwise leaves the onboarding place-picker with no way to
  // proceed for anyone born outside a major city.
  try {
    const withDistrict = [city, district, state, 'India'].filter(Boolean).join(', ');
    let result = await nominatimSearch({ q: withDistrict });

    if (!result && district) {
      const withoutDistrict = [city, state, 'India'].filter(Boolean).join(', ');
      result = await nominatimSearch({ q: withoutDistrict });
    }

    // Structured postal-code search: less precise than a name match, but
    // reliable and unambiguous (unlike dropping state/district from a
    // freeform query, which can silently match a same-named village in the
    // wrong state).
    if (!result && pincode && /^\d{6}$/.test(pincode)) {
      result = await nominatimSearch({ postalcode: pincode, country: 'India' });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(null);
  }
}
