"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, ArrowUpRight, ArrowDownRight, History } from "lucide-react";
import { api, type Transaction } from "@/lib/api";
import IconButton from "@/components/ui/IconButton";
import { formatDistanceToNow } from "date-fns";
import type { TFunction } from "i18next";

/** Wallet transactions carry a backend-internal reason code — map known codes to
 *  a translated label, falling back to the raw code for anything not yet mapped. */
function reasonLabel(reason: string, t: TFunction): string {
  if (reason === "referral_bonus") return t("transactions.reasonReferralBonus", "Referral Bonus");
  return reason;
}

export default function TransactionsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTransactions()
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 px-5 h-16 flex items-center gap-3 bg-background/80 backdrop-blur-md border-b border-gold/10">
        <IconButton onClick={() => router.back()} className="-ml-2"><ArrowLeft /></IconButton>
        <h1 className="text-xl font-display font-semibold text-foreground">
          {t("transactions.title", "Wallet History")}
        </h1>
      </div>

      <div className="flex-1 p-5 max-w-lg mx-auto w-full flex flex-col gap-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gold/40 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gold/5 flex items-center justify-center">
              <History className="w-8 h-8 text-gold/40" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground mb-1">{t("transactions.empty", "No transactions yet")}</h2>
              <p className="text-sm text-muted">{t("transactions.emptyDesc", "Your wallet activity will appear here.")}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.map(txn => {
              const isPositive = txn.delta > 0;
              return (
                <div key={txn.id} className="p-4 rounded-2xl bg-surface border border-gold/10 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                    {isPositive ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">{reasonLabel(txn.reason, t)}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {formatDistanceToNow(new Date(txn.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold ${isPositive ? "text-green-500" : "text-foreground"}`}>
                      {isPositive ? "+" : ""}₹{(txn.delta / 100).toFixed(0)}
                    </p>
                    <p className="text-muted text-[10px] mt-0.5">
                      {t("transactions.balance", "Balance")}: ₹{(txn.balanceAfter / 100).toFixed(0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
