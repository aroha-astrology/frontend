"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ChevronDown, ChevronUp, Trash2, X, Check } from "lucide-react";
import { api, type PurchasePlan, type PurchasePlanAnalysis, type PurchasePlanCategory } from "@/lib/api";
import Card from "@/components/ui/Card";

interface PurchasePlanResultsProps {
  plans: PurchasePlan[];
  pollingId: string | null;
  onPolled: (updated: PurchasePlan) => void;
  onDelete: (id: string) => void;
}

/** Reuses the same category labels shown in the PurchasePlanModal category picker. */
const CATEGORY_LABEL_KEYS: Record<PurchasePlanCategory, string> = {
  vehicle: "horoscope.panchang.categoryVehicle",
  home: "horoscope.panchang.categoryHome",
  commercial: "horoscope.panchang.categoryCommercial",
  other: "horoscope.panchang.categoryOther",
};

function isAnalysis(a: PurchasePlan["analysis"]): a is PurchasePlanAnalysis {
  return !!a && !("parseError" in a);
}

function PurchasePlanCard({ plan, onDelete }: { plan: PurchasePlan; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canExpand = plan.status === "done" && isAnalysis(plan.analysis);

  return (
    <Card className="p-4 border-gold/10">
      <div className="flex items-start justify-between mb-2 gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">{t(CATEGORY_LABEL_KEYS[plan.category])}</p>
          <p className="text-[10px] text-muted mt-0.5">
            {plan.resolvedBookingDate} → {plan.resolvedDeliveryDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(plan.status === "pending" || plan.status === "processing") && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted">
              <Loader2 size={12} className="animate-spin" /> {t("purchasePlan.analyzing")}
            </span>
          )}
          {(plan.status === "error" || (plan.status === "done" && !isAnalysis(plan.analysis))) && (
            <span className="text-[10px] text-red-400">{t("purchasePlan.error")}</span>
          )}
          
          {confirmDelete ? (
            <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-2 py-1">
              <span className="text-[10px] text-red-400 font-medium mr-1">Delete?</span>
              <button onClick={() => setConfirmDelete(false)} className="p-1 hover:bg-white/10 rounded-md text-muted"><X size={12} /></button>
              <button onClick={() => { onDelete(plan.id); setConfirmDelete(false); }} className="p-1 hover:bg-white/10 rounded-md text-red-400"><Check size={12} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-muted hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
              {canExpand && (
                <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-muted hover:text-foreground hover:bg-white/5 rounded-lg transition-colors">
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {plan.status === "done" && isAnalysis(plan.analysis) && expanded && (
        <div className="space-y-3 pt-3 mt-3 border-t border-gold/10 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-lg font-display text-gold">{plan.analysis.overallScore}</span>
            <span className="text-xs text-foreground">{plan.analysis.overallVerdict}</span>
          </div>
          <ul className="text-[11px] text-muted space-y-0.5 list-disc list-inside">
            {plan.analysis.tldr.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>

          {[
            { label: t("purchasePlan.bookingLabel"), d: plan.analysis.bookingDate },
            { label: t("purchasePlan.deliveryLabel"), d: plan.analysis.deliveryDate },
          ].map(({ label, d }) => (
            <div key={label} className="rounded-xl bg-surface/40 p-3">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                {label} · {d.date}
              </p>
              <p className="text-xs text-foreground mb-1.5">
                {d.verdict} ({d.score}/100)
              </p>
              {d.highlights.length > 0 && (
                <p className="text-[10px] text-emerald-400 mb-0.5">✓ {d.highlights.join(" · ")}</p>
              )}
              {d.warnings.length > 0 && <p className="text-[10px] text-amber-400">⚠ {d.warnings.join(" · ")}</p>}
            </div>
          ))}

          {plan.analysis.remedies.length > 0 && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t("purchasePlan.remedies")}</p>
              <p className="text-[11px] text-foreground">{plan.analysis.remedies.join(" · ")}</p>
            </div>
          )}

          <div className="flex gap-4 text-[10px] text-muted">
            <span>
              {t("purchasePlan.luckyColor")}: {plan.analysis.luckyColor}
            </span>
            <span>
              {t("purchasePlan.luckyDirection")}: {plan.analysis.luckyDirection}
            </span>
          </div>

          <p className="text-[11px] text-foreground italic">{plan.analysis.finalAdvice}</p>
        </div>
      )}
    </Card>
  );
}

export default function PurchasePlanResults({ plans, pollingId, onPolled, onDelete }: PurchasePlanResultsProps) {
  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(() => {
      api
        .purchasePlanGet(pollingId)
        .then((plan) => {
          onPolled(plan);
          if (plan.status === "done" || plan.status === "error") {
            clearInterval(interval);
          }
        })
        .catch(() => clearInterval(interval));
    }, 5000);
    return () => clearInterval(interval);
  }, [pollingId, onPolled]);

  if (plans.length === 0) return null;

  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <PurchasePlanCard key={plan.id} plan={plan} onDelete={onDelete} />
      ))}
    </div>
  );
}
