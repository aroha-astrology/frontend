"use client";

import { useTranslation } from "react-i18next";
import type { PalmLineNote } from "@/lib/palm-api";
import { LINE_LABEL_KEYS, MOUNT_LABEL_KEYS } from "@/lib/palm/matchSection";

/**
 * Per-line and per-mount meanings, listed.
 *
 * These used to be reached by tapping the feature on the annotated photo. The overlay was
 * removed (see PalmAnnotatedView) because the traced positions were wrong — but the notes
 * themselves are sound: they come from Stage B, grounded in the deterministic measurements, and
 * they are the "what does this line mean, and what does it suggest" content the reading is for.
 * So they are listed here instead of hidden behind a tap on a drawing we could not trust.
 *
 * Order is fixed rather than following object key order so the list reads the same every time.
 */
const LINE_ORDER = [
  "heartLine",
  "headLine",
  "lifeLine",
  "fateLine",
  "sunLine",
  "healthLine",
  "girdleOfVenus",
  "ringOfSolomon",
  "simianLine",
];

const MOUNT_ORDER = [
  "jupiter",
  "saturn",
  "apollo",
  "mercury",
  "venus",
  "luna",
  "marsUpper",
  "marsLower",
  "rahuPlain",
];

function NoteCard({ labelKey, note }: { labelKey: string; note: PalmLineNote }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-gold/15 bg-card p-4 space-y-2.5">
      <h4 className="font-display text-sm text-gold">{t(labelKey)}</h4>
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
          {t("palm.note.meaning")}
        </p>
        <p className="text-sm text-foreground/85 leading-relaxed">{note.meaning}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
          {t("palm.note.prediction")}
        </p>
        <p className="text-sm text-foreground/85 leading-relaxed">{note.prediction}</p>
      </div>
    </div>
  );
}

export default function PalmLineNotes({ notes }: { notes: Record<string, PalmLineNote> }) {
  const { t } = useTranslation();
  const lines = LINE_ORDER.filter((k) => notes[k]);
  const mounts = MOUNT_ORDER.filter((k) => notes[k]);
  if (lines.length === 0 && mounts.length === 0) return null;

  return (
    <div className="space-y-4">
      {lines.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            {t("palm.notes.linesTitle")}
          </h3>
          {lines.map((key) => (
            <NoteCard key={key} labelKey={LINE_LABEL_KEYS[key] ?? key} note={notes[key]!} />
          ))}
        </section>
      )}
      {mounts.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            {t("palm.notes.mountsTitle")}
          </h3>
          {mounts.map((key) => (
            <NoteCard key={key} labelKey={MOUNT_LABEL_KEYS[key] ?? key} note={notes[key]!} />
          ))}
        </section>
      )}
    </div>
  );
}
