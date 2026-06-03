import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json() as { idToken: string };
    if (!idToken) {
      return NextResponse.json({ error: 'idToken required' }, { status: 400 });
    }

    // Verify Firebase ID token using Firebase Admin
    const { getFirebaseAdminAuth } = await import('@/lib/firebase/admin');
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
    const phone = decoded.phone_number;
    if (!phone) {
      return NextResponse.json({ error: 'No phone number in token' }, { status: 400 });
    }

    // Use Supabase admin to generate a magic-link token for the phone-derived email
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const email = `${phone.replace('+', '')}@phone.aroha.app`;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { shouldCreateUser: true },
    });
    if (error || !data?.properties) {
      return NextResponse.json({ error: error?.message ?? 'Auth failed' }, { status: 500 });
    }

    const { hashed_token, verification_type } = data.properties;
    const isNewUser = data.user?.created_at === data.user?.updated_at;

    return NextResponse.json({
      tokenHash: hashed_token,
      type: verification_type,
      isNewUser,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
