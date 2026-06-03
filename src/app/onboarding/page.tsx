'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  first_name: z.string().min(1, 'Name is required').max(50),
  dob: z.string().min(1, 'Date of birth is required'),
  tob: z.string().min(1, 'Time of birth is required'),
  place: z.string().min(1, 'Place of birth is required').max(100),
});

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ first_name: '', dob: '', tob: '', place: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      // Store birth profile in localStorage until backend API is available
      localStorage.setItem('birth_profile', JSON.stringify(parsed.data));
      router.replace('/home');
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 bg-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Aroha Astrology" width={56} height={56} className="rounded-2xl shadow-sm" />
          </div>
          <h1 className="j-display text-2xl text-text">Tell us about yourself</h1>
          <p className="mt-2 text-sm text-text-muted">We need your birth details for accurate readings</p>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Your name</label>
            <input
              type="text"
              placeholder="First name"
              value={form.first_name}
              onChange={handleChange('first_name')}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Date of birth</label>
            <input
              type="date"
              value={form.dob}
              onChange={handleChange('dob')}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Time of birth</label>
            <input
              type="time"
              value={form.tob}
              onChange={handleChange('tob')}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Place of birth</label>
            <input
              type="text"
              placeholder="City, Country"
              value={form.place}
              onChange={handleChange('place')}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-full py-3 text-[14px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer mt-2"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
