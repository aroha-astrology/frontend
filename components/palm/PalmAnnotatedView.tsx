"use client";

import { useState } from "react";

/**
 * The captured palm photograph, shown plain.
 *
 * This used to draw the vision model's traced line polylines and the nine mount positions over
 * the photo. That was removed on 2026-08-23 after checking it against a real capture: the traced
 * paths did not follow the actual creases, and the mount dots landed off the hand entirely
 * (on the floor and on a cushion behind it). Drawing a confidently-wrong "Heart Line" across
 * someone's palm is worse than drawing nothing — it makes the whole reading look invented.
 *
 * The per-line meanings and predictions did NOT go away: Stage B still returns them keyed by
 * line id, and the report page lists them below this photo (see PalmLineNotes). What is gone is
 * only the claim that we know where on THIS photograph each line runs.
 *
 * If the drawing comes back it needs, at minimum: a vision model that can be shown to trace
 * creases accurately on real user photos, and a visible confidence gate that suppresses the
 * overlay rather than degrading it.
 */
export interface PalmAnnotatedViewProps {
  photoUrl: string | null;
}

export default function PalmAnnotatedView({ photoUrl }: PalmAnnotatedViewProps) {
  const [aspect, setAspect] = useState<number | null>(null);

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden border border-gold/20 bg-black"
      style={{ aspectRatio: aspect ?? 4 / 5 }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setAspect(img.naturalWidth / img.naturalHeight);
            }
          }}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-surface" />
      )}
    </div>
  );
}
