"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth/AuthProvider";

export type CognitoAuthContextValue = {
  user: AuthUser | null;
  groups: string[];
  loading: boolean;
  signIn: (username: string, password: string) => Promise<
    | { ok: true }
    | { ok: false; error: string; challenge?: Record<string, unknown> }
  >;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CognitoAuthContext = createContext<CognitoAuthContextValue | undefined>(undefined);

export function CognitoAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const res = await fetch("/api/auth/cognito/session", { credentials: "include" });
    const data = (await res.json()) as { authenticated?: boolean; user?: AuthUser | null };
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void bootstrap().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/cognito/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      user?: AuthUser;
      error?: string;
      challengeName?: string;
      session?: string | null;
      mfaOptional?: boolean;
    };

    if (res.status === 409 && data.challengeName) {
      return {
        ok: false as const,
        error: "auth_challenge",
        challenge: {
          challengeName: data.challengeName,
          session: data.session ?? null,
          mfaOptional: data.mfaOptional,
        },
      };
    }

    if (!res.ok || !data.user) {
      return { ok: false as const, error: data.error ?? "sign_in_failed" };
    }

    setUser(data.user);
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/cognito/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/cognito/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      setUser(null);
      return;
    }

    const data = (await res.json()) as { user?: AuthUser | null };
    if (data.user) setUser(data.user);
    else await bootstrap();
  }, [bootstrap]);

  const value = useMemo<CognitoAuthContextValue>(
    () => ({
      user,
      groups: user?.groups ?? [],
      loading,
      signIn,
      signOut,
      refresh,
    }),
    [user, loading, signIn, signOut, refresh]
  );

  return <CognitoAuthContext.Provider value={value}>{children}</CognitoAuthContext.Provider>;
}

export function useCognitoAuth(): CognitoAuthContextValue {
  const ctx = useContext(CognitoAuthContext);
  if (!ctx) {
    throw new Error("useCognitoAuth must be used inside CognitoAuthProvider");
  }
  return ctx;
}
