"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import { codeMessage, hookMeta } from "@/lib/hooks-copy";
import type { HookKey } from "@/lib/hooks-types";
import type { HookLoad } from "@/hooks/useHookView";

/**
 * The frame every daily-return hook page shares: a back button and title, the guard for the hook's
 * switch (a missing key counts as OFF), and the loading and failure states, so each page only draws
 * its own content once the data is there.
 */
export default function HookPage({
  hook,
  load,
  loadCode,
  reload,
  hasData,
  children,
}: {
  hook: HookKey;
  load: HookLoad;
  loadCode: string | null;
  reload: () => void;
  hasData: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const meta = hookMeta(hook);
  return (
    <NewFeatureGuard featureKey={meta.feature}>
      <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground" data-testid={`hook-${meta.slug}`}>
        <ParticleBackground />
        <div className="relative z-10 page-container pt-8 space-y-4 page-cols">
          <div className="flex items-center gap-3">
            <IconButton onClick={() => router.back()} aria-label="Back">
              <ArrowLeft size={18} />
            </IconButton>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-display truncate">{meta.title}</h1>
              <p className="text-xs text-muted truncate">{meta.tagline}</p>
            </div>
          </div>

          {!hasData && load !== "failed" && (
            <div className="py-16 text-center text-sm text-muted" aria-busy="true" data-testid="hook-loading">
              Loading…
            </div>
          )}
          {!hasData && load === "failed" && (
            <div className="py-12 text-center space-y-3" data-testid="hook-failed">
              <p className="text-sm text-muted">{codeMessage(loadCode)}</p>
              <button type="button" onClick={reload} className="h-10 rounded-full border border-gold/25 px-5 text-sm">
                Try again
              </button>
            </div>
          )}
          {hasData && children}
        </div>
      </main>
    </NewFeatureGuard>
  );
}
