"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see layout.tsx).

import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  type AdminGiftCampaignRow,
  type CreateGiftCampaignBody,
  type AudiencePreview,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import ErrorRetry from "@/components/admin/ErrorRetry";
import ConfirmModal from "@/components/admin/ConfirmModal";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

/** Pre-authored suggestions only — the admin can still type any custom title. Dates are best-known-so-far; lunar ones can move ±1 day. */
const FESTIVAL_SUGGESTIONS: { title: string; date: string }[] = [
  { title: "Eid Milad-un-Nabi 2026", date: "2026-08-25" },
  { title: "Raksha Bandhan 2026", date: "2026-08-28" },
  { title: "Janmashtami 2026", date: "2026-09-04" },
  { title: "Ganesh Chaturthi 2026", date: "2026-09-14" },
  { title: "Gandhi Jayanti 2026", date: "2026-10-02" },
  { title: "Navratri 2026", date: "2026-10-11" },
  { title: "Dussehra 2026", date: "2026-10-20" },
  { title: "Karva Chauth 2026", date: "2026-10-29" },
  { title: "Diwali 2026", date: "2026-11-08" },
  { title: "Bhai Dooj 2026", date: "2026-11-11" },
  { title: "Guru Nanak Gurpurab 2026", date: "2026-11-24" },
  { title: "Christmas Eve 2026", date: "2026-12-24" },
  { title: "Christmas 2026", date: "2026-12-25" },
  { title: "New Year 2027", date: "2027-01-01" },
  { title: "Lohri 2027", date: "2027-01-13" },
  { title: "Makar Sankranti 2027", date: "2027-01-14" },
  { title: "Republic Day 2027", date: "2027-01-26" },
  { title: "Ramadan Begins 2027", date: "2027-02-09" },
  { title: "Eid-ul-Fitr 2027", date: "2027-03-10" },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: AdminGiftCampaignRow["status"]): string {
  switch (status) {
    case "draft":
      return "⚪ draft";
    case "scheduled":
      return "🟡 scheduled";
    case "sent":
      return "✅ sent";
    case "canceled":
      return "⚫ canceled";
  }
}

function NewCampaignModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (row: AdminGiftCampaignRow) => void;
}) {
  const [title, setTitle] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [maxBalanceRupees, setMaxBalanceRupees] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"self_claim" | "auto_credit">("auto_credit");
  const [claimWindowDays, setClaimWindowDays] = useState("5");
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [creditExpiryDays, setCreditExpiryDays] = useState("14");
  const [scheduledSendAt, setScheduledSendAt] = useState("");
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountPaise = Math.round(parseFloat(amountRupees || "0") * 100);
  const maxBalancePaise = maxBalanceRupees.trim() ? Math.round(parseFloat(maxBalanceRupees) * 100) : null;

  async function runPreview() {
    if (!amountPaise) return;
    setPreviewBusy(true);
    try {
      const result = await adminApi.previewGiftCampaignAudience(amountPaise, maxBalancePaise);
      setPreview(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to preview audience");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !amountPaise) {
      setError("Title and a positive amount are required");
      return;
    }
    setBusy(true);
    setError(null);
    const body: CreateGiftCampaignBody = {
      title: title.trim(),
      amountPaise,
      audienceMaxBalancePaise: maxBalancePaise,
      deliveryMode,
      claimWindowDays: deliveryMode === "self_claim" ? parseInt(claimWindowDays, 10) || null : null,
      creditExpiryDays: expiryEnabled ? parseInt(creditExpiryDays, 10) || null : null,
      scheduledSendAt: scheduledSendAt ? new Date(scheduledSendAt).toISOString() : null,
    };
    try {
      const row = await adminApi.createGiftCampaign(body);
      onCreated(row);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create campaign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheetModal
      onClose={() => !busy && onClose()}
      closeLabel="Close"
      header={<h2 className="text-base font-semibold text-foreground">New Gift Campaign</h2>}
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted block mb-1">Festival or custom title</label>
          <input
            type="text"
            list="festival-suggestions"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Diwali 2026"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
          <datalist id="festival-suggestions">
            {FESTIVAL_SUGGESTIONS.map((f) => (
              <option key={f.title} value={f.title}>{`${f.date}`}</option>
            ))}
          </datalist>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Amount (₹)</label>
          <input
            type="number"
            min="1"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Only wallets under ₹ (blank = everyone)</label>
          <input
            type="number"
            min="1"
            value={maxBalanceRupees}
            onChange={(e) => setMaxBalanceRupees(e.target.value)}
            placeholder="e.g. 250"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </div>

        <div>
          <label className="text-xs text-muted block mb-2">Delivery</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeliveryMode("auto_credit")}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${deliveryMode === "auto_credit" ? "bg-gold text-black border-gold" : "border-border text-muted"}`}
            >
              Auto-credit
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMode("self_claim")}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${deliveryMode === "self_claim" ? "bg-gold text-black border-gold" : "border-border text-muted"}`}
            >
              Self-claim
            </button>
          </div>
        </div>

        {deliveryMode === "self_claim" && (
          <div>
            <label className="text-xs text-muted block mb-1">Claim window (days)</label>
            <input
              type="number"
              min="1"
              value={claimWindowDays}
              onChange={(e) => setClaimWindowDays(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-xs text-muted mb-1">
            <input
              type="checkbox"
              checked={expiryEnabled}
              onChange={(e) => setExpiryEnabled(e.target.checked)}
            />
            Credit expires if unspent
          </label>
          {expiryEnabled && (
            <input
              type="number"
              min="1"
              value={creditExpiryDays}
              onChange={(e) => setCreditExpiryDays(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
              placeholder="Days after credit"
            />
          )}
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">
            Schedule for (blank = save as draft, send manually)
          </label>
          <input
            type="datetime-local"
            value={scheduledSendAt}
            onChange={(e) => setScheduledSendAt(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </div>

        <button
          type="button"
          onClick={runPreview}
          disabled={!amountPaise || previewBusy}
          className="w-full py-2 rounded-xl border border-border text-foreground text-xs font-medium disabled:opacity-50"
        >
          {previewBusy ? "Checking…" : "Preview audience"}
        </button>
        {preview && (
          <p className="text-xs text-muted text-center">
            {preview.eligibleCount} eligible ({preview.pushableCount} pushable) · total cost{" "}
            {formatRupees(preview.totalCostPaise)}
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="w-full px-4 py-3 rounded-2xl bg-gold text-black text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Campaign"}
        </button>
      </div>
    </BottomSheetModal>
  );
}

export default function AdminGiftCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AdminGiftCampaignRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AdminGiftCampaignRow | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [sendBusyId, setSendBusyId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listGiftCampaigns()
      .then((res) => setCampaigns(res.campaigns))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load campaigns"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function handleSendNow(row: AdminGiftCampaignRow) {
    setSendBusyId(row.id);
    setSendError(null);
    try {
      const updated = await adminApi.sendGiftCampaignNow(row.id);
      setCampaigns((prev) => prev && prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Failed to send campaign");
    } finally {
      setSendBusyId(null);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      await adminApi.cancelGiftCampaign(cancelTarget.id);
      setCampaigns(
        (prev) => prev && prev.map((c) => (c.id === cancelTarget.id ? { ...c, status: "canceled" } : c)),
      );
      setCancelTarget(null);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Failed to cancel campaign");
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gold">Gift Campaigns</h1>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="px-4 py-2 rounded-full bg-gold text-black text-sm font-medium"
        >
          New Campaign
        </button>
      </div>

      {loading && !campaigns && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchCampaigns} />}
      {sendError && <p className="text-sm text-red-400 mb-3">{sendError}</p>}

      {campaigns &&
        !error &&
        (campaigns.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">
            No gift campaigns yet. Create one for an upcoming festival or occasion.
          </p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground">{c.title}</span>
                  <span className="text-xs text-muted">{statusBadge(c.status)}</span>
                </div>
                <p className="text-xs text-muted mb-2">
                  {formatRupees(c.amountPaise)} ·{" "}
                  {c.audienceMaxBalancePaise
                    ? `wallets under ${formatRupees(c.audienceMaxBalancePaise)}`
                    : "all users"}{" "}
                  · {c.deliveryMode === "self_claim" ? `self-claim, ${c.claimWindowDays}-day window` : "auto-credit"}
                  {c.creditExpiryDays ? ` · expires in ${c.creditExpiryDays} days` : ""}
                </p>
                <p className="text-xs text-muted mb-3">
                  {c.status === "scheduled" && `Scheduled for ${formatDateTime(c.scheduledSendAt)}`}
                  {c.status === "sent" && `Sent ${formatDateTime(c.sentAt)}`}
                  {c.status === "draft" && "Not scheduled — send manually when ready"}
                  {c.status === "canceled" && "Canceled"}
                </p>
                {(c.status === "draft" || c.status === "scheduled") && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendNow(c)}
                      disabled={sendBusyId === c.id}
                      className="px-3 py-1.5 rounded-full bg-gold text-black text-xs font-medium disabled:opacity-50"
                    >
                      {sendBusyId === c.id ? "Sending…" : "Send Now"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelTarget(c)}
                      className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
                    >
                      {c.status === "scheduled" ? "Cancel" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

      {showNew && (
        <NewCampaignModal
          onClose={() => setShowNew(false)}
          onCreated={(row) => {
            setCampaigns((prev) => (prev ? [row, ...prev] : [row]));
            setShowNew(false);
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmModal
          title="Cancel Campaign"
          body={
            <>
              Cancel <strong className="text-foreground">{cancelTarget.title}</strong>? This cannot be undone.
            </>
          }
          confirmLabel="Cancel Campaign"
          busy={cancelBusy}
          error={cancelError}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
