"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth/AuthProvider";
import { readApiJson } from "@/lib/http/readApiJson";

export type CognitoAuthChallengePayload = {
  challengeName: string;
  session?: string | null;
  mfaOptional?: boolean;
  requiresPasswordChange?: boolean;
};

export type CognitoAuthContextValue = {
  user: AuthUser | null;
  groups: string[];
  loading: boolean;
  signIn: (
    username: string,
    password: string,
    nextParam?: string | null
  ) => Promise<
    | { ok: true; redirectTo?: string; groups?: string[] }
    | { ok: false; error: string; challenge?: CognitoAuthChallengePayload }
  >;
  completeNewPassword: (
    username: string,
    session: string,
    newPassword: string,
    nextParam?: string | null
  ) => Promise<
    | { ok: true; redirectTo?: string; groups?: string[] }
    | { ok: false; error: string; challenge?: CognitoAuthChallengePayload }
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
    const parsed = await readApiJson<{ authenticated?: boolean; user?: AuthUser | null }>(res);
    if (!parsed.ok) {
      setUser(null);
      return;
    }
    setUser(parsed.data.user ?? null);
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

  const signIn = useCallback(async (username: string, password: string, nextParam?: string | null) => {
    const res = await fetch("/api/auth/cognito/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, next: nextParam ?? undefined }),
    });
    const parsed = await readApiJson<{
      ok?: boolean;
      user?: AuthUser;
      redirectTo?: string;
      error?: string;
      challengeName?: string;
      session?: string | null;
      mfaOptional?: boolean;
      requiresPasswordChange?: boolean;
    }>(res);
    if (!parsed.ok) {
      return { ok: false as const, error: parsed.error };
    }
    const { data, status } = parsed;

    if (status === 409 && data.challengeName) {
      console.warn("[cognito/client] login challenge", {
        challengeName: data.challengeName,
        requiresPasswordChange: data.requiresPasswordChange === true,
      });
      return {
        ok: false as const,
        error: "auth_challenge",
        challenge: {
          challengeName: data.challengeName,
          session: data.session ?? null,
          mfaOptional: data.mfaOptional,
          requiresPasswordChange: data.requiresPasswordChange === true,
        },
      };
    }

    if (status < 200 || status >= 400 || !data.user) {
      return { ok: false as const, error: data.error ?? "sign_in_failed" };
    }

    setUser(data.user);
    return {
      ok: true as const,
      redirectTo: data.redirectTo,
      groups: data.user.groups,
    };
  }, []);

  const completeNewPassword = useCallback(
    async (username: string, session: string, newPassword: string, nextParam?: string | null) => {
      const res = await fetch("/api/auth/cognito/new-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          session,
          newPassword,
          next: nextParam ?? undefined,
        }),
      });
      const parsed = await readApiJson<{
        ok?: boolean;
        user?: AuthUser;
        redirectTo?: string;
        error?: string;
        challengeName?: string;
        session?: string | null;
        mfaOptional?: boolean;
        requiresPasswordChange?: boolean;
      }>(res);
      if (!parsed.ok) {
        return { ok: false as const, error: parsed.error };
      }
      const { data, status } = parsed;

      if (status === 409 && data.challengeName) {
        console.warn("[cognito/client] new-password follow-on challenge", data.challengeName);
        return {
          ok: false as const,
          error: "auth_challenge",
          challenge: {
            challengeName: data.challengeName,
            session: data.session ?? null,
            mfaOptional: data.mfaOptional,
            requiresPasswordChange: data.requiresPasswordChange === true,
          },
        };
      }

      if (status < 200 || status >= 400 || !data.user) {
        return { ok: false as const, error: data.error ?? "password_change_failed" };
      }

      setUser(data.user);
      return {
        ok: true as const,
        redirectTo: data.redirectTo,
        groups: data.user.groups,
      };
    },
    []
  );

  const signOut = useCallback(async () => {
    await fetch("/api/auth/cognito/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/cognito/refresh", {
      method: "POST",
      credentials: "include",
    });

    const parsed = await readApiJson<{ user?: AuthUser | null }>(res);
    if (!parsed.ok || parsed.status < 200 || parsed.status >= 400) {
      setUser(null);
      return;
    }

    const { data } = parsed;
    if (data.user) setUser(data.user);
    else await bootstrap();
  }, [bootstrap]);

  const value = useMemo<CognitoAuthContextValue>(
    () => ({
      user,
      groups: user?.groups ?? [],
      loading,
      signIn,
      completeNewPassword,
      signOut,
      refresh,
    }),
    [user, loading, signIn, completeNewPassword, signOut, refresh]
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
