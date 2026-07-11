"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

type BackHandler = () => void;

interface BackHandlerContextValue {
  /** Registers a handler to run on the next hardware back press; returns an unregister fn. */
  push: (handler: BackHandler) => () => void;
  /** Runs the topmost registered handler, if any. Returns true if one handled the press. */
  handleBack: () => boolean;
}

const BackHandlerContext = createContext<BackHandlerContextValue | null>(null);

/**
 * Stack of "close this overlay" callbacks, most-recently-opened last.
 * Lets any dismissible overlay (drawer, sheet, tour, modal) opt into being
 * closed by the Android hardware back button via `useDismissOnBackPress`,
 * without every overlay needing its own native back-press wiring.
 */
export function BackHandlerProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<BackHandler[]>([]);

  const push = useCallback((handler: BackHandler) => {
    stackRef.current.push(handler);
    return () => {
      stackRef.current = stackRef.current.filter((h) => h !== handler);
    };
  }, []);

  const handleBack = useCallback(() => {
    const top = stackRef.current[stackRef.current.length - 1];
    if (!top) return false;
    top();
    return true;
  }, []);

  return (
    <BackHandlerContext.Provider value={{ push, handleBack }}>
      {children}
    </BackHandlerContext.Provider>
  );
}

function useBackHandlerContext() {
  const ctx = useContext(BackHandlerContext);
  if (!ctx) throw new Error("useBackHandlerContext must be used within BackHandlerProvider");
  return ctx;
}

/** Used only by the single global listener that talks to Capacitor. */
export function useBackHandlerDispatch() {
  return useBackHandlerContext().handleBack;
}

/** Registers `onClose` to run on hardware back press while `active` is true. */
export function useDismissOnBackPress(active: boolean, onClose: () => void) {
  const { push } = useBackHandlerContext();
  useEffect(() => {
    if (!active) return;
    return push(onClose);
  }, [active, onClose, push]);
}
