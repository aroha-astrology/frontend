import { NextRequest, NextResponse } from 'next/server';

// Whether a visitor is offered Firebase phone OTP on top of Google sign-in.
// 'phone' (India) = OTP form + Google; 'google' = Google only. Google is
// available everywhere; OTP is the India-only extra.
export type AuthMethod = 'phone' | 'google';

export const dynamic = 'force-dynamic';

function countryFromRequest(req: NextRequest): string | null {
  // Vercel's edge network sets this on every request; absent in local dev
  // and any non-Vercel host.
  const header = req.headers.get('x-vercel-ip-country');
  return header ? header.toUpperCase() : null;
}

export async function GET(req: NextRequest) {
  let country = countryFromRequest(req);

  // Dev-only override so the Google branch is testable without a Vercel edge
  // — never honoured in production.
  if (process.env.NODE_ENV !== 'production') {
    const override = req.nextUrl.searchParams.get('region');
    if (override) country = override.toUpperCase();
  }

  // No signal at all (local dev, non-Vercel host) defaults to India/OTP —
  // OTP works everywhere, so this is the safe default when detection fails.
  const method: AuthMethod = !country || country === 'IN' ? 'phone' : 'google';

  return NextResponse.json(
    { country, method },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
