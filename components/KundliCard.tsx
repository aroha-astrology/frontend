"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles, ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";
import { api, ApiError, type KundliResult } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

/**
 * Home-screen card surfacing the current user's natal kundli.
 *
 * Backend contract (swagger /v1/kundli):
 *   - 200 ready                → render preview + link to full chart
 *   - 202 pending/generating   → spinner, poll every 2 s until ready
 *   - 422 missing_parameters   → CTA to complete the profile
 * Renders nothing when signed out.
 */
export default function KundliCard() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [result, setResult] = useState<KundliResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Wait for auth to resolve and a session user to exist.
    if (authLoading || !user) return;

    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;

    (async () => {
      setError(null);
      try {
        // pollKundli handles the 202 retry-every-2-seconds loop internally.
        const r = await api.pollKundli({ intervalMs: 2000, timeoutMs: 90_000, signal: ctrl.signal });
        if (!ctrl.signal.aborted) setResult(r);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : t("kundli.errorGeneric"));
      }
    })();

    return () => ctrl.abort();
  }, [authLoading, user, t]);

  // Hide entirely until a session exists — nothing to fetch.
  if (authLoading || !user) return null;

  const isPending =
    !result && !error
      ? true
      : result?.status === "pending" || result?.status === "generating";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="p-5 border-gold/20 bg-gradient-to-br from-card via-card to-purple-950/20">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full border border-gold/40 flex items-center justify-center text-gold drop-shadow-[0_0_8px_rgba(223,181,100,0.35)]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-foreground text-base font-display leading-tight">
                {t("kundli.title")}
              </h2>
              <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">
                {t("kundli.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* --- States --- */}
        {error ? (
          <p className="text-[12px] text-red-400">{error}</p>
        ) : isPending ? (
          <PendingState message={(result as { message?: string } | null)?.message} />
        ) : result?.status === "missing_parameters" ? (
          <MissingState missing={result.missing} message={result.message} />
        ) : result?.status === "failed" ? (
          <FailedState
            onRetry={async () => {
              setError(null);
              setResult(null);
              try {
                const r = await api.regenerateKundli();
                setResult(r);
              } catch (e) {
                setError(e instanceof ApiError ? e.message : t("kundli.errorGeneric"));
              }
            }}
          />
        ) : result?.status === "ready" ? (
          <ReadyState kundli={result} />
        ) : null}
      </Card>
    </motion.div>
  );
}

/* ---------- Sub-states ---------- */

function PendingState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-muted">
      <Loader2 size={14} className="animate-spin text-gold" />
      <span>{message ?? t("kundli.pending")}</span>
    </div>
  );
}

function MissingState({ missing, message }: { missing: string[]; message: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-muted">{message}</p>
      {missing.length > 0 && (
        <p className="text-[11px] text-muted/70">
          {t("kundli.missingNeeded")}: <span className="text-foreground">{missing.join(", ")}</span>
        </p>
      )}
      <Link
        href="/onboarding"
        className="mt-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gold/15 border border-gold/40 text-gold text-[13px] font-medium hover:bg-gold/25 transition-colors"
      >
        {t("kundli.completeProfile")} <ChevronRight size={14} />
      </Link>
    </div>
  );
}

function FailedState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-red-400">{t("kundli.failed")}</p>
      <button
        onClick={onRetry}
        className="self-start text-[12px] text-gold underline underline-offset-2"
      >
        {t("kundli.retry")}
      </button>
    </div>
  );
}

function ReadyState({ kundli }: { kundli: Extract<KundliResult, { status: "ready" }> }) {
  const { t } = useTranslation();
  // Conservatively render only what we can guarantee from the loose schema.
  const ascendant = readString(kundli.chart, "ascendant");
  const moonSign = readString(kundli.chart, "moonSign") ?? readNested(kundli.chart, ["moon", "sign"]);
  const sunSign = readString(kundli.chart, "sunSign") ?? readNested(kundli.chart, ["sun", "sign"]);
  const currentDasha =
    readString(kundli.dasha, "current") ?? readNested(kundli.dasha, ["currentMahadasha", "planet"]);

  const facts: Array<{ label: string; value: string }> = [];
  if (ascendant) facts.push({ label: t("kundli.ascendant"), value: ascendant });
  if (moonSign) facts.push({ label: t("kundli.moonSign"), value: moonSign });
  if (sunSign) facts.push({ label: t("kundli.sunSign"), value: sunSign });
  if (currentDasha) facts.push({ label: t("kundli.dasha"), value: currentDasha });

  return (
    <div className="flex flex-col gap-3">
      {kundli.timeKnown === false && (
        <p className="text-[10px] text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-md px-2 py-1.5">
          {t("kundli.timeUnknown")}
        </p>
      )}

      {facts.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {facts.map((f) => (
            <div
              key={f.label}
              className="rounded-xl border border-gold/15 bg-surface px-3 py-2"
            >
              <div className="text-[9px] text-muted uppercase tracking-wider">{f.label}</div>
              <div className="text-[13px] text-foreground font-medium mt-0.5">{f.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted">{t("kundli.readyNoPreview")}</p>
      )}

      <Link
        href="/kundli"
        className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gold/15 border border-gold/40 text-gold text-[13px] font-medium hover:bg-gold/25 transition-colors"
      >
        {t("kundli.viewFull")} <ChevronRight size={14} />
      </Link>
    </div>
  );
}

/* ---------- Defensive readers for the loose chart/dasha bags ---------- */

function readString(obj: Record<string, unknown> | null, key: string): string | undefined {
  const v = obj?.[key];
  return typeof v === "string" ? v : undefined;
}

function readNested(obj: Record<string, unknown> | null, path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}
