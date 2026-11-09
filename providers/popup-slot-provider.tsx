"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTour } from "@/providers/tour-provider";
import { canOpenPopup, type PopupId } from "@/lib/popup-slot";

interface PopupSlotContextValue {
  holder: PopupId | null;
  pending: ReadonlySet<PopupId>;
  register: (id: PopupId) => void;
  settle: (id: PopupId) => void;
  claim: (id: PopupId) => boolean;
}

// Fail open: with no provider mounted a pop-up may open, so nothing is stuck waiting forever.
const PopupSlotContext = createContext<PopupSlotContextValue>({
  holder: null,
  pending: new Set(),
  register: () => {},
  settle: () => {},
  claim: () => true,
});

/**
 * Holds the one pop-up slot of this app open (see lib/popup-slot.ts for the rule and the priority order). Sits inside
 * TourProvider because a running tour counts as the Welcome/Tour pop-up: once it has started, the promotional pop-ups
 * wait for a later visit.
 */
export function PopupSlotProvider({ children }: { children: ReactNode }) {
  const { tourActive, tourPending } = useTour();
  const [holder, setHolder] = useState<PopupId | null>(null);
  const [pending, setPending] = useState<ReadonlySet<PopupId>>(() => new Set());
  const holderRef = useRef<PopupId | null>(null);
  const pendingRef = useRef<ReadonlySet<PopupId>>(pending);

  const updatePending = useCallback((next: ReadonlySet<PopupId>) => {
    pendingRef.current = next;
    setPending(next);
  }, []);

  const register = useCallback(
    (id: PopupId) => {
      if (!pendingRef.current.has(id)) updatePending(new Set(pendingRef.current).add(id));
    },
    [updatePending],
  );

  const settle = useCallback(
    (id: PopupId) => {
      if (!pendingRef.current.has(id)) return;
      const next = new Set(pendingRef.current);
      next.delete(id);
      updatePending(next);
    },
    [updatePending],
  );

  const claim = useCallback(
    (id: PopupId) => {
      if (!canOpenPopup(id, { holder: holderRef.current, pending: pendingRef.current })) return false;
      holderRef.current = id;
      setHolder(id);
      // Showing is a decision: the pop-up is no longer "still deciding" for the ones below it.
      if (pendingRef.current.has(id)) {
        const next = new Set(pendingRef.current);
        next.delete(id);
        updatePending(next);
      }
      return true;
    },
    [updatePending],
  );

  // A tour on screen (or about to be) is the Welcome/Tour pop-up of this open.
  useEffect(() => {
    if ((tourActive || tourPending) && !holderRef.current) {
      holderRef.current = "welcome";
      setHolder("welcome");
    }
  }, [tourActive, tourPending]);

  const value = useMemo(
    () => ({ holder, pending, register, settle, claim }),
    [holder, pending, register, settle, claim],
  );
  return <PopupSlotContext.Provider value={value}>{children}</PopupSlotContext.Provider>;
}

/**
 * What a pop-up uses to take part in the one-per-open rule. It counts as "still deciding" from mount until it calls
 * `settle()` (it decided not to show, or is done) or unmounts. Check `canOpen`, then call `claim()` at the moment of
 * showing; if `claim()` is false, do not show.
 */
export function usePopupSlot(id: PopupId) {
  const { holder, pending, register, settle, claim } = useContext(PopupSlotContext);
  useEffect(() => {
    register(id);
    return () => settle(id);
  }, [id, register, settle]);
  return {
    canOpen: canOpenPopup(id, { holder, pending }),
    claim: useCallback(() => claim(id), [claim, id]),
    settle: useCallback(() => settle(id), [settle, id]),
  };
}
