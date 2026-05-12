"use client";

import type { ReactNode } from "react";

export {
  useMerchCartCompat as useMerchCart,
  useMerchCartCompatOptional as useMerchCartOptional,
} from "./CommerceCartContext";

/** @deprecated No-op wrapper — cart state lives in {@link CartProvider} / CommerceCartProvider */
export function MerchCartProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
