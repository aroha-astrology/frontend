import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input');
  if (!input || !API_KEY) return NextResponse.json([]);

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK') return NextResponse.json([]);

  return NextResponse.json(
    data.predictions.map((p: any) => ({ placeId: p.place_id, description: p.description }))
  );
}
