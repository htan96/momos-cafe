"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth/AuthProvider";
import { readApiJson } from "@/lib/http/readApiJson";
import { fetchWithTimeout } from "@/lib/http/fetchWithTimeout";
import { isTransientHttpStatus } from "@/lib/http/transientHttp";

const AUTH_FETCH_TIMEOUT_MS = 12_000;

export type CognitoAuthChallengePayload = {
  challengeName: string;
  session?: string | null;
  mfaOptional?: boolean;
  requiresPasswordChange?: boolean;
  mfaSetupPending?: boolean;
  softwareTokenMfaPending?: boolean;
  smsMfaPending?: boolean;
  selectMfaTypePending?: boolean;
};

type CognitoAuthFailurePayload = {
  ok: false;
  error: string;
  code?: string;
  message?: string;
  challenge?: CognitoAuthChallengePayload;
};

export type CognitoAuthContextValue = {
  user: AuthUser | null;
  groups: string[];
  loading: boolean;
  signIn: (
    username: string,
    password: string,
    nextParam?: string | null
  ) => Promise<{ ok: true; redirectTo?: string; groups?: string[] } | CognitoAuthFailurePayload>;

  completeNewPassword: (
    username: string,
    session: string,
    newPassword: string,
    nextParam?: string | null
  ) => Promise<{ ok: true; redirectTo?: string; groups?: string[] } | CognitoAuthFailurePayload>;

  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CognitoAuthContext = createContext<CognitoAuthContextValue | undefined>(undefined);

export function CognitoAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    let res: Response;
    try {
      res = await fetchWithTimeout("/api/auth/cognito/session", {
        credentials: "include",
        timeoutMs: AUTH_FETCH_TIMEOUT_MS,
      });
    } catch {
      return;
    }
    const parsed = await readApiJson<{ authenticated?: boolean; user?: AuthUser | null }>(res);
    if (!parsed.ok) {
      if (!isTransientHttpStatus(parsed.status)) {
        setUser(null);
      }
      return;
    }
    if (!parsed.data.authenticated) {
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
    let res: Response;
    try {
      res = await fetch("/api/auth/cognito/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, next: nextParam ?? undefined }),
      });
    } catch {
      return {
        ok: false as const,
        error: "We could not reach the sign-in service. Check your connection and try again.",
        code: "NETWORK",
      };
    }

    const parsed = await readApiJson<{
      ok?: boolean;
      user?: AuthUser;
      redirectTo?: string;
      error?: string;
      code?: string;
      message?: string;
      challengeName?: string;
      session?: string | null;
      mfaOptional?: boolean;
      requiresPasswordChange?: boolean;
      mfaSetupPending?: boolean;
      softwareTokenMfaPending?: boolean;
      smsMfaPending?: boolean;
      selectMfaTypePending?: boolean;
      mfaRelated?: boolean;
    }>(res);
    if (!parsed.ok) {
      return { ok: false as const, error: parsed.error, code: "PARSE" };
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
        code: typeof data.code === "string" ? data.code : "AUTH_CHALLENGE",
        challenge: {
          challengeName: data.challengeName,
          session: data.session ?? null,
          mfaOptional: data.mfaOptional,
          requiresPasswordChange: data.requiresPasswordChange === true,
          mfaSetupPending: data.mfaSetupPending === true,
          softwareTokenMfaPending: data.softwareTokenMfaPending === true,
          smsMfaPending: data.smsMfaPending === true,
          selectMfaTypePending: data.selectMfaTypePending === true,
        },
      };
    }

    if (status < 200 || status >= 400 || !data.user) {
      const code = typeof data.code === "string" ? data.code : undefined;
      const hint = typeof data.message === "string" && data.message.trim().length > 0 ? data.message.trim() : undefined;
      return {
        ok: false as const,
        error: data.error ?? "sign_in_failed",
        ...(code ? { code } : {}),
        ...(hint ? { message: hint } : {}),
      };
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
      let res: Response;
      try {
        res = await fetch("/api/auth/cognito/new-password", {
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
      } catch {
        return {
          ok: false as const,
          error: "We could not reach the server. Check your connection and try again.",
          code: "NETWORK",
        };
      }

      const parsed = await readApiJson<{
        ok?: boolean;
        user?: AuthUser;
        redirectTo?: string;
        error?: string;
        code?: string;
        message?: string;
        challengeName?: string;
        session?: string | null;
        mfaOptional?: boolean;
        requiresPasswordChange?: boolean;
        mfaSetupPending?: boolean;
        softwareTokenMfaPending?: boolean;
        smsMfaPending?: boolean;
        selectMfaTypePending?: boolean;
      }>(res);
      if (!parsed.ok) {
        return { ok: false as const, error: parsed.error, code: "PARSE" };
      }
      const { data, status } = parsed;

      if (status === 409 && data.challengeName) {
        console.warn("[cognito/client] new-password follow-on challenge", data.challengeName);
        return {
          ok: false as const,
          error: "auth_challenge",
          code: typeof data.code === "string" ? data.code : "AUTH_CHALLENGE",
          challenge: {
            challengeName: data.challengeName,
            session: data.session ?? null,
            mfaOptional: data.mfaOptional,
            requiresPasswordChange: data.requiresPasswordChange === true,
            mfaSetupPending: data.mfaSetupPending === true,
            softwareTokenMfaPending: data.softwareTokenMfaPending === true,
            smsMfaPending: data.smsMfaPending === true,
            selectMfaTypePending: data.selectMfaTypePending === true,
          },
        };
      }

      if (status < 200 || status >= 400 || !data.user) {
        const code = typeof data.code === "string" ? data.code : undefined;
        const hint = typeof data.message === "string" && data.message.trim().length > 0 ? data.message.trim() : undefined;
        return {
          ok: false as const,
          error: data.error ?? "password_change_failed",
          ...(code ? { code } : {}),
          ...(hint ? { message: hint } : {}),
        };
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
    let res: Response;
    try {
      res = await fetchWithTimeout("/api/auth/cognito/refresh", {
        method: "POST",
        credentials: "include",
        timeoutMs: AUTH_FETCH_TIMEOUT_MS,
      });
    } catch {
      return;
    }

    const parsed = await readApiJson<{ user?: AuthUser | null; ok?: boolean }>(res);
    if (!parsed.ok) {
      if (!isTransientHttpStatus(parsed.status)) {
        setUser(null);
      }
      return;
    }
    if (parsed.status < 200 || parsed.status >= 400) {
      if (!isTransientHttpStatus(parsed.status)) {
        setUser(null);
      }
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
