"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import { api, type Order, type OrderStatus } from "@/lib/api";
import { formatRupees } from "@/lib/format";

function statusLabel(t: (key: string) => string, status: OrderStatus): string {
  switch (status) {
    case "paid":
      return t("orderHistory.statusPaid");
    case "pending":
      return t("orderHistory.statusPending");
    case "failed":
      return t("orderHistory.statusFailed");
    case "cancelled":
      return t("orderHistory.statusCancelled");
  }
}

function statusClasses(status: OrderStatus): string {
  switch (status) {
    case "paid":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "pending":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    default:
      return "text-red-400 bg-red-500/10 border-red-500/30";
  }
}

export default function OrderHistoryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .orderHistory()
      .then(({ orders }) => setOrders(orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground">{t("orderHistory.title")}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-gold" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center text-center py-14">
            <Wallet size={28} className="text-muted mb-3" />
            <p className="text-sm text-muted">{t("orderHistory.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {orders.map((order) => (
              <Card key={order.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{formatRupees(order.finalAmountPaise)}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusClasses(order.status)}`}
                >
                  {statusLabel(t, order.status)}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
