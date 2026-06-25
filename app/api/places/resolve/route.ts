import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId');
  if (!placeId || !API_KEY) return NextResponse.json(null);

  // Geocode
  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${API_KEY}`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();
  if (geoData.status !== 'OK' || !geoData.results?.length) return NextResponse.json(null);

  const result = geoData.results[0];
  const lat = result.geometry.location.lat;
  const lon = result.geometry.location.lng;
  const name = result.formatted_address;

  // Timezone
  const tsUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${Math.floor(Date.now() / 1000)}&key=${API_KEY}`;
  const tsRes = await fetch(tsUrl);
  const tsData = await tsRes.json();
  const tz = tsData.status === 'OK' ? tsData.timeZoneId : 'Asia/Kolkata';

  return NextResponse.json({ name, lat, lon, tz });
}
