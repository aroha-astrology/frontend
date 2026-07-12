"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Lets a page inject extra controls into the shared TopBar's right side
 * (e.g. kundli's Plain/Technical toggle) now that TopBar is hoisted into the
 * root layout instead of being rendered per-page — see TopBar.tsx for why.
 */
interface TopBarContextValue {
  rightContent: ReactNode | null;
  setRightContent: (content: ReactNode | null) => void;
}

const TopBarContext = createContext<TopBarContextValue>({
  rightContent: null,
  setRightContent: () => {},
});

export function TopBarProvider({ children }: { children: ReactNode }) {
  const [rightContent, setRightContent] = useState<ReactNode | null>(null);
  return (
    <TopBarContext.Provider value={{ rightContent, setRightContent }}>{children}</TopBarContext.Provider>
  );
}

export const useTopBarContext = () => useContext(TopBarContext);

/** Registers `content` as the TopBar's right-side slot for as long as the calling page is mounted. */
export function useTopBarRightContent(content: ReactNode | null) {
  const { setRightContent } = useContext(TopBarContext);
  useEffect(() => {
    setRightContent(content);
    return () => setRightContent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);
}
