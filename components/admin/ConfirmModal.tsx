"use client";

import type { ReactNode } from "react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

/** Shared destructive-action confirm dialog — same shape as app/settings/page.tsx's delete-profile confirm sheet. */
export default function ConfirmModal({
  title,
  body,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  busy: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <BottomSheetModal
      onClose={() => !busy && onCancel()}
      closeLabel="Close"
      header={<h2 className="text-base font-semibold text-foreground">{title}</h2>}
    >
      <div className="text-sm text-muted mb-5">{body}</div>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 px-4 py-3 rounded-2xl border border-gold/20 text-sm font-medium text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheetModal>
  );
}
