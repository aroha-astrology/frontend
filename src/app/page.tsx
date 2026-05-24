import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Root of the authenticated app. The (app)/dashboard route handles auth-gating;
// if logged out, dashboard's loader redirects to /login. The marketing landing page
// lives in the separate `aroha-astrology/landing` repo.
export default function RootPage() {
  redirect('/dashboard');
}
