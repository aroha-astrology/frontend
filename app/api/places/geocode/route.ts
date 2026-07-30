import { NextRequest, NextResponse } from 'next/server';
import tzLookup from 'tz-lookup';
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

  // Worldwide-search suggestions (see /api/places/search's worldwide branch)
  // already carry coordinates from Nominatim's search step — skip straight
  // to a timezone lookup instead of re-geocoding from a city name.
  const latParam = req.nextUrl.searchParams.get('lat');
  const lonParam = req.nextUrl.searchParams.get('lon');
  if (latParam && lonParam) {
    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json(null);
    try {
      return NextResponse.json({ lat, lon, tz: tzLookup(lat, lon) });
    } catch {
      return NextResponse.json(null);
    }
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

    if (!result) return NextResponse.json(null);
    // Real IANA timezone from coordinates — every place used to be hardcoded
    // to Asia/Kolkata here, which was silently correct only because search
    // used to be India-only.
    return NextResponse.json({ ...result, tz: tzLookup(result.lat, result.lon) });
  } catch {
    return NextResponse.json(null);
  }
}
