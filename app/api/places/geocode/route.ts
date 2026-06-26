import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city')?.trim();
  const state = req.nextUrl.searchParams.get('state')?.trim();
  const district = req.nextUrl.searchParams.get('district')?.trim();

  if (!city) return NextResponse.json(null);

  const parts = [city, district, state, 'India'].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ArohaAstrology/1.0' },
    });
    const data = await res.json();

    if (!data.length) return NextResponse.json(null);

    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    });
  } catch {
    return NextResponse.json(null);
  }
}
