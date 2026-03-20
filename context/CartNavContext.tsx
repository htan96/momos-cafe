"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";

interface CartNavContextValue {
  setOnCartClick: (fn: (() => void) | null) => void;
  setOnMenuScroll: (fn: (() => void) | null) => void;
  callCartClick: () => void;
  callMenuScroll: () => void;
}

const CartNavContext = createContext<CartNavContextValue | null>(null);

export function CartNavProvider({ children }: { children: ReactNode }) {
  const onCartClickRef = useRef<(() => void) | null>(null);
  const onMenuScrollRef = useRef<(() => void) | null>(null);

  const setOnCartClick = useCallback((fn: (() => void) | null) => {
    onCartClickRef.current = fn;
  }, []);

  const setOnMenuScroll = useCallback((fn: (() => void) | null) => {
    onMenuScrollRef.current = fn;
  }, []);

  const callCartClick = useCallback(() => {
    onCartClickRef.current?.();
  }, []);

  const callMenuScroll = useCallback(() => {
    onMenuScrollRef.current?.();
  }, []);

  const value: CartNavContextValue = {
    setOnCartClick,
    setOnMenuScroll,
    callCartClick,
    callMenuScroll,
  };

  return (
    <CartNavContext.Provider value={value}>{children}</CartNavContext.Provider>
  );
}

export function useCartNav() {
  const ctx = useContext(CartNavContext);
  if (!ctx) return null;
  return ctx;
}
