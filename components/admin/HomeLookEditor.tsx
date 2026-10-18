"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see app/admin/layout.tsx).

import { useState } from "react";
import {
  HOME_CARDS,
  SLOT_LABELS,
  SLOT_NAMES,
  dropCard,
  moveCard,
  type LookLayout,
  type SlotName,
} from "@/lib/home-cards";

const LABEL_OF = new Map(HOME_CARDS.map((c) => [c.id, c.label]));

/**
 * One look's card order and its hero per time of day. Reorder with the arrows (works on a phone) or
 * by dragging a row. A card whose admin switch is off is marked but stays in the list: the order is
 * kept, the card just does not show until its switch is on.
 */
export default function HomeLookEditor({
  title,
  testId,
  look,
  switchedOff,
  onChange,
}: {
  title: string;
  testId: string;
  look: LookLayout;
  /** Card ids whose admin switch is currently off. */
  switchedOff: ReadonlySet<string>;
  onChange: (next: LookLayout) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);

  function setOrder(order: string[]) {
    // A hero that is no longer in the order cannot happen (the order never loses a card), so only the order changes.
    onChange({ ...look, order });
  }

  function setHero(slot: SlotName, id: string) {
    onChange({ ...look, heroBySlot: { ...look.heroBySlot, [slot]: id === "" ? null : id } });
  }

  return (
    <section data-testid={testId} className="rounded-2xl border border-border bg-surface/40 p-4">
      <h2 className="text-base font-semibold text-foreground mb-3">{title}</h2>

      <ol className="space-y-2">
        {look.order.map((id, index) => (
          <li
            key={id}
            data-testid={`${testId}-card-${id}`}
            draggable
            onDragStart={() => setDragging(id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging) setOrder(dropCard(look.order, dragging, id));
              setDragging(null);
            }}
            onDragEnd={() => setDragging(null)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
              dragging === id ? "border-gold bg-gold/10" : "border-border bg-surface"
            }`}
          >
            <span className="w-5 text-right text-xs text-muted">{index + 1}</span>
            <span className="flex-1 min-w-0 truncate text-foreground">{LABEL_OF.get(id) ?? id}</span>
            {switchedOff.has(id) && (
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
                switched off
              </span>
            )}
            <button
              type="button"
              aria-label={`Move ${LABEL_OF.get(id) ?? id} up`}
              disabled={index === 0}
              onClick={() => setOrder(moveCard(look.order, id, -1))}
              className="h-8 w-8 shrink-0 rounded-lg border border-border text-muted disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${LABEL_OF.get(id) ?? id} down`}
              disabled={index === look.order.length - 1}
              onClick={() => setOrder(moveCard(look.order, id, 1))}
              className="h-8 w-8 shrink-0 rounded-lg border border-border text-muted disabled:opacity-30"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>

      <h3 className="mt-5 mb-2 text-sm font-medium text-foreground">Card that leads at each time of day</h3>
      <div className="grid grid-cols-2 gap-3">
        {SLOT_NAMES.map((slot) => (
          <label key={slot} className="block text-xs text-muted">
            {SLOT_LABELS[slot]}
            <select
              data-testid={`${testId}-hero-${slot}`}
              value={look.heroBySlot[slot] ?? ""}
              onChange={(e) => setHero(slot, e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-2 py-2 text-sm text-foreground"
            >
              <option value="">Nothing special</option>
              {look.order.map((id) => (
                <option key={id} value={id}>
                  {LABEL_OF.get(id) ?? id}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}
