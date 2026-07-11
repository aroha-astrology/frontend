"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface PermissionsPromptContextValue {
  /**
   * True once the one-time location/notifications prompt has either
   * finished (user tapped Enable/Not now) or determined it doesn't apply
   * this session (already asked before, or non-native platform). False
   * while it's still pending/visible — lets other first-launch UI (the
   * home tour) wait its turn instead of stacking on top of it.
   */
  resolved: boolean;
  markResolved: () => void;
}

// Defaults to resolved=true (fail open) so anything reading this context
// without a mounted provider never gets stuck waiting forever.
const PermissionsPromptContext = createContext<PermissionsPromptContextValue>({
  resolved: true,
  markResolved: () => {},
});

export function PermissionsPromptProvider({ children }: { children: ReactNode }) {
  const [resolved, setResolved] = useState(false);
  const markResolved = useCallback(() => setResolved(true), []);

  return (
    <PermissionsPromptContext.Provider value={{ resolved, markResolved }}>
      {children}
    </PermissionsPromptContext.Provider>
  );
}

export const usePermissionsPrompt = () => useContext(PermissionsPromptContext);
