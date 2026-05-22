import { performance } from "node:perf_hooks";
import type { Prisma } from "@prisma/client";
import {
  hasLikelyResolvableAwsCredentials,
  resolveAwsRegion,
} from "@/lib/aws/awsRuntimeEnv";
import { sesAccountProbe } from "@/lib/email/transports/sendEmailViaSes";
import { prisma } from "@/lib/prisma";
import {
  INTEGRATION_SYSTEM_KEYS,
  type IntegrationHealthCheckResult,
} from "@/lib/operations/integrationHealth/types";

export {
  INTEGRATION_HEALTH_DISPLAY_ORDER,
  INTEGRATION_SYSTEM_KEYS,
  type IntegrationHealthCheckResult,
  type IntegrationHealthCategory,
  type IntegrationHealthStatus,
  type IntegrationSystemKey,
} from "@/lib/operations/integrationHealth/types";

function truncateError(message: string, max = 500): string {
  if (message.length <= max) return message;
  return `${message.slice(0, Math.max(0, max - 1))}…`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function internalSiteBaseUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, "");
  const v = process.env.VERCEL_URL?.trim();
  if (v) {
    const host = v.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

async function checkDatabase(): Promise<IntegrationHealthCheckResult> {
  const systemKey = INTEGRATION_SYSTEM_KEYS.DATABASE;
  const started = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - started);
    return {
      systemKey,
      category: "data",
      currentStatus: "healthy",
      latencyMs,
      failureRate: null,
      lastErrorMessage: null,
      metadata: { endpoint: "postgresql", query: "SELECT 1" },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      systemKey,
      category: "data",
      currentStatus: "offline",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: truncateError(msg),
      metadata: { endpoint: "postgresql", query: "SELECT 1", error: "query_failed" },
    };
  }
}

async function checkCognito(): Promise<IntegrationHealthCheckResult> {
  const systemKey = INTEGRATION_SYSTEM_KEYS.COGNITO;
  const region = process.env.COGNITO_REGION?.trim();
  const userPoolId = process.env.COGNITO_USER_POOL_ID?.trim();
  if (!region || !userPoolId) {
    return {
      systemKey,
      category: "auth",
      currentStatus: "unknown",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: "Cognito region or user pool not configured in env",
      metadata: { endpoint: "jwks.json", configured: false },
    };
  }

  const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  const started = performance.now();
  try {
    const res = await fetchWithTimeout(url, { method: "GET" }, 5000);
    const latencyMs = Math.round(performance.now() - started);
    if (res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const keys = body && typeof body === "object" && body !== null && "keys" in body;
      return {
        systemKey,
        category: "auth",
        currentStatus: keys ? "healthy" : "degraded",
        latencyMs,
        failureRate: null,
        lastErrorMessage: keys ? null : "JWKS response missing keys array",
        metadata: { httpStatus: res.status, endpoint: url },
      };
    }
    if (res.status === 404) {
      return {
        systemKey,
        category: "auth",
        currentStatus: "offline",
        latencyMs: null,
        failureRate: null,
        lastErrorMessage: truncateError(`JWKS returned HTTP ${res.status}`),
        metadata: { httpStatus: res.status, endpoint: url },
      };
    }
    return {
      systemKey,
      category: "auth",
      currentStatus: "degraded",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: truncateError(`JWKS returned HTTP ${res.status}`),
      metadata: { httpStatus: res.status, endpoint: url },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      systemKey,
      category: "auth",
      currentStatus: "offline",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: truncateError(msg),
      metadata: { endpoint: url, error: "fetch_failed" },
    };
  }
}

function squareApiBaseUrl(): string {
  const env = (process.env.SQUARE_ENVIRONMENT ?? "").trim().toLowerCase();
  return env === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
}

async function checkSquare(): Promise<IntegrationHealthCheckResult> {
  const systemKey = INTEGRATION_SYSTEM_KEYS.SQUARE;
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!token) {
    return {
      systemKey,
      category: "commerce",
      currentStatus: "unknown",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: "not configured",
      metadata: { endpoint: "/v2/locations", configured: false },
    };
  }

  const base = squareApiBaseUrl();
  const url = `${base}/v2/locations`;
  const started = performance.now();
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          SquareVersion: "2024-10-17",
        },
      },
      3000
    );
    const latencyMs = Math.round(performance.now() - started);
    if (res.ok) {
      return {
        systemKey,
        category: "commerce",
        currentStatus: "healthy",
        latencyMs,
        failureRate: null,
        lastErrorMessage: null,
        metadata: { httpStatus: res.status, endpoint: url },
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        systemKey,
        category: "commerce",
        currentStatus: "degraded",
        latencyMs: null,
        failureRate: null,
        lastErrorMessage: truncateError(`Square locations HTTP ${res.status}`),
        metadata: { httpStatus: res.status, endpoint: url },
      };
    }
    return {
      systemKey,
      category: "commerce",
      currentStatus: res.status >= 500 ? "degraded" : "offline",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: truncateError(`Square locations HTTP ${res.status}`),
      metadata: { httpStatus: res.status, endpoint: url },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      systemKey,
      category: "commerce",
      currentStatus: "offline",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: truncateError(msg),
      metadata: { endpoint: url, error: "fetch_failed" },
    };
  }
}

function isShippoProductionEnv(): boolean {
  const m = (process.env.SHIPPO_ENV ?? "").trim().toLowerCase();
  return m === "production" || m === "live";
}

function isDisallowedShippoTestKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return k.startsWith("shippo_test_") || k.includes("shippo_test");
}

async function checkShippo(): Promise<IntegrationHealthCheckResult> {
  const systemKey = INTEGRATION_SYSTEM_KEYS.SHIPPO;
  const key = process.env.SHIPPO_API_KEY?.trim();
  if (!key) {
    return {
      systemKey,
      category: "shipping",
      currentStatus: "unknown",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: "not configured",
      metadata: { endpoint: "/v1/carrier_accounts/", configured: false },
    };
  }
  if (!isShippoProductionEnv()) {
    return {
      systemKey,
      category: "shipping",
      currentStatus: "unknown",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: "SHIPPO_ENV must be production or live for live checks",
      metadata: { configured: false, reason: "shippo_env" },
    };
  }
  if (isDisallowedShippoTestKey(key)) {
    return {
      systemKey,
      category: "shipping",
      currentStatus: "unknown",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: "Test/sandbox Shippo keys are rejected by policy",
      metadata: { configured: false, reason: "test_key" },
    };
  }

  const url = "https://api.goshippo.com/v1/carrier_accounts/";
  const started = performance.now();
  try {
    const res = await fetchWithTimeout(
      url,
      { method: "GET", headers: { Authorization: `ShippoToken ${key}` } },
      5000
    );
    const latencyMs = Math.round(performance.now() - started);
    if (res.ok) {
      return {
        systemKey,
        category: "shipping",
        currentStatus: "healthy",
        latencyMs,
        failureRate: null,
        lastErrorMessage: null,
        metadata: { httpStatus: res.status, endpoint: url },
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        systemKey,
        category: "shipping",
        currentStatus: "degraded",
        latencyMs: null,
        failureRate: null,
        lastErrorMessage: truncateError(`Shippo HTTP ${res.status}`),
        metadata: { httpStatus: res.status, endpoint: url },
      };
    }
    return {
      systemKey,
      category: "shipping",
      currentStatus: res.status >= 500 ? "degraded" : "offline",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: truncateError(`Shippo HTTP ${res.status}`),
      metadata: { httpStatus: res.status, endpoint: url },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      systemKey,
      category: "shipping",
      currentStatus: "offline",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: truncateError(msg),
      metadata: { endpoint: url, error: "fetch_failed" },
    };
  }
}

async function checkEmail(): Promise<IntegrationHealthCheckResult> {
  const systemKey = INTEGRATION_SYSTEM_KEYS.EMAIL;
  const region = resolveAwsRegion();
  const credsHeuristic = hasLikelyResolvableAwsCredentials();
  const sesFromConfigured = Boolean(process.env.SES_FROM_EMAIL?.trim());
  /**
   * Inbound Resend webhook secret present (`verifyResendInbound` — Svix signatures).
   * Does **not** imply outbound connectivity; SES is the sole transactional outbound transport.
   */
  const resendInboundConfigured = Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
  /** Only surfaced when SES failed after an attempted probe or prerequisites missing. */
  let loneSesProbeMessage: string | null = null;

  const outboundMetaBase = {
    outboundTransport: "ses" as const,
    sesFromConfigured,
    resendInboundConfigured,
    sendgridApiKeyPresent: Boolean(process.env.SENDGRID_API_KEY?.trim()),
  };

  /** SES outbound health: `GetAccount` when heuristic credentials + region exist. */
  if (region && credsHeuristic) {
    const started = performance.now();
    try {
      const probe = await sesAccountProbe();
      const latencyMs = Math.round(performance.now() - started);

      if (probe.ok) {
        const metadata = {
          ...outboundMetaBase,
          provider: "ses" as const,
          endpoint: `ses.${region}.amazonaws.com`,
          maxSendRate: probe.maxSendRate ?? null,
        };

        if (!sesFromConfigured) {
          return {
            systemKey,
            category: "comms",
            currentStatus: "degraded",
            latencyMs,
            failureRate: null,
            lastErrorMessage: "SES reachable but SES_FROM_EMAIL unset",
            metadata,
          };
        }

        return {
          systemKey,
          category: "comms",
          currentStatus: "healthy",
          latencyMs,
          failureRate: null,
          lastErrorMessage: null,
          metadata,
        };
      }

      loneSesProbeMessage = truncateError(
        `SES (${probe.sdkName ?? "api"}): ${probe.code}${probe.message ? ` — ${probe.message}` : ""}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      loneSesProbeMessage =
        loneSesProbeMessage ?? truncateError(`SES probe threw: ${msg}`, 460);
    }
  }

  if (!region) {
    return {
      systemKey,
      category: "comms",
      currentStatus: "unknown",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: "AWS_REGION (or AWS_DEFAULT_REGION) unset — cannot probe SES outbound",
      metadata: { ...outboundMetaBase, configured: false },
    };
  }
  if (!credsHeuristic) {
    return {
      systemKey,
      category: "comms",
      currentStatus: "unknown",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage:
        loneSesProbeMessage ??
        "No heuristic AWS credential hints (IAM role / keys / container) — SES outbound readiness unknown",
      metadata: loneSesProbeMessage
        ? { ...outboundMetaBase, configured: false, sesProbeSummary: loneSesProbeMessage.slice(0, 200) }
        : { ...outboundMetaBase, configured: false },
    };
  }

  return {
    systemKey,
    category: "comms",
    currentStatus: "offline",
    latencyMs: null,
    failureRate: null,
    lastErrorMessage: loneSesProbeMessage ?? "SES GetAccount probe failed — transactional outbound unhealthy",
    metadata: loneSesProbeMessage
      ? { ...outboundMetaBase, configured: false, sesProbeSummary: loneSesProbeMessage.slice(0, 200) }
      : { ...outboundMetaBase, configured: false },
  };
}

async function checkInternalApi(): Promise<IntegrationHealthCheckResult> {
  const systemKey = INTEGRATION_SYSTEM_KEYS.INTERNAL_API;
  const base = internalSiteBaseUrl();
  const url = `${base}/api/health`;
  const started = performance.now();
  try {
    const res = await fetchWithTimeout(url, { method: "GET", headers: { Accept: "application/json" } }, 5000);
    const latencyMs = Math.round(performance.now() - started);
    if (res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const ok =
        body &&
        typeof body === "object" &&
        body !== null &&
        "ok" in body &&
        (body as { ok?: unknown }).ok === true;
      return {
        systemKey,
        category: "platform",
        currentStatus: ok ? "healthy" : "degraded",
        latencyMs,
        failureRate: null,
        lastErrorMessage: ok ? null : "Response JSON missing ok:true",
        metadata: { httpStatus: res.status, endpoint: url, baseUrl: base },
      };
    }
    return {
      systemKey,
      category: "platform",
      currentStatus: res.status >= 500 ? "degraded" : "offline",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: truncateError(`GET /api/health HTTP ${res.status}`),
      metadata: { httpStatus: res.status, endpoint: url, baseUrl: base },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      systemKey,
      category: "platform",
      currentStatus: "offline",
      latencyMs: null,
      failureRate: null,
      lastErrorMessage: truncateError(msg),
      metadata: { endpoint: url, baseUrl: base, error: "fetch_failed" },
    };
  }
}

/**
 * Run all integration probes in parallel (per-check timeouts keep wall time bounded, typically &lt; 8s).
 */
export async function runIntegrationHealthChecks(): Promise<IntegrationHealthCheckResult[]> {
  const runners = [
    checkDatabase,
    checkCognito,
    checkSquare,
    checkShippo,
    checkEmail,
    checkInternalApi,
  ];
  return Promise.all(runners.map((fn) => fn()));
}

export async function persistIntegrationHealthSnapshots(
  results: IntegrationHealthCheckResult[]
): Promise<void> {
  const now = new Date();

  for (const r of results) {
    const isSuccess = r.currentStatus === "healthy";
    const isFailed = r.currentStatus === "degraded" || r.currentStatus === "offline";

    await prisma.integrationHealthSnapshot.upsert({
      where: { systemKey: r.systemKey },
      create: {
        systemKey: r.systemKey,
        category: r.category,
        currentStatus: r.currentStatus,
        latencyMs: r.latencyMs,
        failureRate: null,
        lastSuccessfulCheckAt: isSuccess ? now : null,
        lastFailedCheckAt: isFailed ? now : null,
        lastErrorMessage: isSuccess
          ? null
          : r.lastErrorMessage
            ? truncateError(r.lastErrorMessage)
            : null,
        metadata: (r.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      update: {
        category: r.category,
        currentStatus: r.currentStatus,
        latencyMs: r.latencyMs,
        failureRate: null,
        ...(isSuccess
          ? {
              lastSuccessfulCheckAt: now,
              lastErrorMessage: null,
            }
          : {}),
        ...(isFailed
          ? {
              lastFailedCheckAt: now,
              lastErrorMessage: r.lastErrorMessage ? truncateError(r.lastErrorMessage) : null,
            }
          : {}),
        ...(r.currentStatus === "unknown"
          ? {
              lastErrorMessage: r.lastErrorMessage ? truncateError(r.lastErrorMessage) : null,
            }
          : {}),
        metadata: (r.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}