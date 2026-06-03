'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { sendPhoneOTP, confirmPhoneOTP, resetPhoneAuth } from '@/lib/firebase/phone-auth';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

function normalisePhone(digits: string) {
  return `+91${digits.replace(/\D/g, '').replace(/^0/, '')}`;
}

export default function SignUpPage() {
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(digits)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOTP(normalisePhone(digits), recaptchaRef.current);
      setOtpSent(true);
      toast.success('OTP sent!');
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to send OTP');
      resetPhoneAuth();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const { idToken } = await confirmPhoneOTP(otp);

      const res = await fetch('/api/auth/phone-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Sign-up failed');
      }
      const { tokenHash, type, isNewUser } = await res.json() as {
        tokenHash: string;
        type: string;
        isNewUser?: boolean;
      };

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' });
      if (error) throw error;

      window.location.href = isNewUser ? '/onboarding' : '/home';
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 bg-bg overflow-hidden">
      <div ref={recaptchaRef} />
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Aroha Astrology" width={56} height={56} className="rounded-2xl shadow-sm" />
          </div>
          <p className="j-eyebrow text-accent text-[10px] mb-1.5" data-no-translate>
            <span style={{ fontFamily: 'var(--font-devanagari)' }}>नमस्ते</span> · NAMASTE
          </p>
          <h1 className="j-display text-2xl text-text" data-no-translate>Aroha Astrology</h1>
          <p className="mt-1.5 text-sm text-text-muted">Begin your cosmic journey</p>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-6 shadow-[0_4px_24px_rgba(36,28,21,0.06)]">
          <h2 className="j-display text-base text-text mb-5 text-center">Create your account</h2>

          {!otpSent ? (
            <div>
              <div className="flex rounded-xl border border-border overflow-hidden mb-3 bg-surface-2">
                <span className="flex items-center px-3 text-sm text-text-muted border-r border-border whitespace-nowrap">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Mobile number"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  className="flex-1 bg-transparent px-3 py-3 text-sm text-text placeholder:text-text-muted/50 outline-none"
                />
              </div>
              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full rounded-full py-3 text-[14px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-center text-xs text-text-muted mb-3">OTP sent to +91 {phone}</p>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                autoFocus
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-xl tracking-[0.5em] font-semibold text-text placeholder:text-text-muted/40 outline-none focus:border-accent mb-3"
              />
              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full rounded-full py-3 text-[14px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Verifying…' : 'Verify & Create account'}
              </button>
              <button
                onClick={() => { setOtpSent(false); setOtp(''); resetPhoneAuth(); }}
                className="w-full mt-2 text-xs text-text-muted/70 hover:text-text-muted underline cursor-pointer bg-transparent border-0"
              >
                Change number / Resend OTP
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-center text-[11px] text-text-muted/70">
            By registering, you agree to our{' '}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-muted">
              Terms &amp; Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-muted">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
