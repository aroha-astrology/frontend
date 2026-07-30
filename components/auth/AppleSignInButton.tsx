"use client";

import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

function AppleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 17 20" aria-hidden="true" fill="currentColor">
      <path d="M13.98 10.6c.02 2.16 1.9 2.88 1.92 2.89-.02.06-.3 1.02-.99 2.01-.6.87-1.22 1.73-2.2 1.75-.96.02-1.27-.57-2.37-.57-1.1 0-1.44.55-2.35.59-.94.04-1.66-.94-2.27-1.8-1.24-1.78-2.19-5.04-.92-7.23.63-1.09 1.76-1.78 2.98-1.8.93-.02 1.8.63 2.37.63.57 0 1.63-.78 2.75-.66.47.02 1.78.19 2.62 1.44-.07.04-1.56.91-1.54 2.75Zm-2.4-5.36c.5-.6.84-1.44.75-2.28-.72.03-1.6.48-2.12 1.08-.46.53-.87 1.39-.76 2.2.79.06 1.6-.4 2.13-1Z" />
    </svg>
  );
}

interface AppleSignInButtonProps {
  onClick: () => void;
  busy: boolean;
  /** True until the Apple Developer / Firebase Apple provider setup is complete — shows a disabled "Coming soon" state instead of wiring up sign-in. */
  comingSoon?: boolean;
}

/**
 * Apple's HIG asks for a solid black button with the Apple mark + "Sign in
 * with Apple" — shown only on iOS, alongside Google, to satisfy App Store
 * guideline 4.8 (an app can't offer a third-party login without an
 * equivalent private one).
 */
export default function AppleSignInButton({ onClick, busy, comingSoon }: AppleSignInButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      onClick={comingSoon ? undefined : onClick}
      disabled={busy || comingSoon}
      className="mt-3 w-full py-4 rounded-xl bg-black text-white font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-[0.98] transition-transform"
    >
      {busy ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <>
          <AppleMark />
          {comingSoon ? t("auth.appleComingSoon") : t("auth.continueWithApple")}
        </>
      )}
    </button>
  );
}
