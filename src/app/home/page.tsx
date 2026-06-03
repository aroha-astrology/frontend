'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('birth_profile');
      if (raw) {
        const profile = JSON.parse(raw) as { first_name?: string };
        if (profile.first_name) setFirstName(profile.first_name);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <h1 className="j-display text-4xl text-text">
        {firstName ? `Hello ${firstName}` : 'Hello'}
      </h1>
    </div>
  );
}
