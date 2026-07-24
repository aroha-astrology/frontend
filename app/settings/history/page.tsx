"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, MessageCircle, Compass, Gem, UserPlus, Home, RotateCcw, Gift, Wallet, Users, Flame } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import { api, type Transaction, type OrderStatus } from "@/lib/api";
import { formatRupees } from "@/lib/format";

function statusLabel(t: (key: string) => string, status: OrderStatus): string {
  switch (status) {
    case "paid": return t("paymentHistory.statusPaid");
    case "pending": return t("paymentHistory.statusPending");
    case "failed": return t("paymentHistory.statusFailed");
    case "cancelled": return t("paymentHistory.statusCancelled");
  }
}

function statusClasses(status: OrderStatus): string {
  switch (status) {
    case "paid": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "pending": return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    default: return "text-red-400 bg-red-500/10 border-red-500/30";
  }
}

function kindIcon(kind: Transaction["kind"]) {
  switch (kind) {
    case "recharge": return <Wallet size={16} />;
    case "chat": return <MessageCircle size={16} />;
    case "vastu_report": return <Compass size={16} />;
    case "gemstone_unlock": return <Gem size={16} />;
    case "profile_creation": return <UserPlus size={16} />;
    case "house_unlock": return <Home size={16} />;
    case "referral_bonus": return <Gift size={16} />;
    case "astrologer_booking": return <Users size={16} />;
    case "pooja_booking": return <Flame size={16} />;
  }
}

function kindLabel(t: (key: string, opts?: Record<string, unknown>) => string, txn: Transaction): string {
  switch (txn.kind) {
    case "recharge": return t("paymentHistory.title");
    case "chat": return t("paymentHistory.chat");
    case "vastu_report": return t("paymentHistory.vastuReport");
    case "gemstone_unlock": return t("paymentHistory.gemstoneUnlock");
    case "profile_creation": return t("paymentHistory.profileCreation");
    case "house_unlock": return t("paymentHistory.houseUnlock", { houseNumber: txn.houseNumber });
    case "referral_bonus": return t("paymentHistory.referralBonus");
    case "astrologer_booking": return t("paymentHistory.astrologerBooking");
    case "pooja_booking": return t("paymentHistory.poojaBooking");
  }
}

/** Whether this row is money flowing INTO the wallet (green, +) vs. out of it (red, -).
 *  Recharges and referral bonuses are always credits; everything else is a debit unless it's a refund. */
function isCredit(txn: Transaction): boolean {
  if (txn.kind === "recharge" || txn.kind === "referral_bonus") return true;
  return txn.isRefund;
}

function TransactionRow({ txn, t }: { txn: Transaction; t: (key: string, opts?: Record<string, unknown>) => string }) {
  if (txn.kind === "recharge") {
    return (
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-gold">{kindIcon(txn.kind)}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{formatRupees(txn.amountPaise)}</p>
            <p className="text-xs text-muted mt-0.5">{new Date(txn.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusClasses(txn.status)}`}>
          {statusLabel(t, txn.status)}
        </span>
      </Card>
    );
  }

  const credit = isCredit(txn);
  return (
    <Card className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-gold">{txn.isRefund ? <RotateCcw size={16} /> : kindIcon(txn.kind)}</span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {txn.isRefund ? t("paymentHistory.refund") : kindLabel(t, txn)}
          </p>
          <p className="text-xs text-muted mt-0.5">{new Date(txn.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${credit ? "text-emerald-400" : "text-red-400"}`}>
          {credit ? "+" : "-"}
          {formatRupees(txn.amountPaise)}
        </p>
        <p className="text-[11px] text-muted mt-0.5">
          {t("paymentHistory.balanceLabel", { balance: formatRupees(txn.balanceAfterPaise) })}
        </p>
      </div>
    </Card>
  );
}

export default function PaymentHistoryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.transactionHistory()
      .then(({ transactions }) => setTransactions(transactions))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground">{t("paymentHistory.title")}</h1>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-gold" /></div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center text-center py-14">
            <Wallet size={28} className="text-muted mb-3" />
            <p className="text-sm text-muted">{t("paymentHistory.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} t={t} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
