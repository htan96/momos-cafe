"use client";

import { CognitoAuthProvider } from "@/components/auth/CognitoAuthProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <CognitoAuthProvider>{children}</CognitoAuthProvider>;
}
