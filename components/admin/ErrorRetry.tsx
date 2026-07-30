"use client";

/** Shared "fetch failed" state for admin pages — a message plus a retry button, never a crashed tree. */
export default function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-10">
      <p className="text-sm text-muted mb-3">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-full border border-gold/40 text-gold text-sm hover:bg-gold/10 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
