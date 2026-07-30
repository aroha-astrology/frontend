"use client";

import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.61Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.91-2.26c-.81.54-1.85.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  onClick: () => void;
  busy: boolean;
}

/** Primary CTA for the Google-only branch of the auth screens — same visual weight as the phone flow's "Send OTP" button. */
export default function GoogleSignInButton({ onClick, busy }: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#a67c00] via-[#D4AF37] to-[#f4d675] text-[#1a0e00] font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2.5 shadow-[0_0_24px_rgba(212,175,55,0.35)] disabled:opacity-50 active:scale-[0.98] transition-transform"
    >
      {busy ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <>
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white shrink-0">
            <GoogleMark />
          </span>
          {t("auth.continueWithGoogle")}
        </>
      )}
    </button>
  );
}
