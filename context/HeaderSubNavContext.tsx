"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface HeaderSubNavContextValue {
  subNav: ReactNode;
  setSubNav: (node: ReactNode) => void;
}

const HeaderSubNavContext = createContext<HeaderSubNavContextValue | null>(null);

export function HeaderSubNavProvider({ children }: { children: ReactNode }) {
  const [subNav, setSubNavState] = useState<ReactNode>(null);
  const setSubNav = useCallback((node: ReactNode) => setSubNavState(node), []);
  return (
    <HeaderSubNavContext.Provider value={{ subNav, setSubNav }}>
      {children}
    </HeaderSubNavContext.Provider>
  );
}

export function useHeaderSubNav() {
  return useContext(HeaderSubNavContext);
}
