import { slidingWindowLimited } from "@/lib/auth/cognito/rateLimitSliding";
import { clientIpFromRequest } from "@/lib/presence/requestMeta";

const loginStore = new Map<string, number[]>();
const totpStore = new Map<string, number[]>();
const recoveryStore = new Map<string, number[]>();

const LOGIN_MAX = 8;
const LOGIN_WINDOW_MS = 60_000;
const TOTP_MAX = 10;
const TOTP_WINDOW_MS = 60_000;
const RECOVERY_MAX = 5;
const RECOVERY_WINDOW_MS = 60_000;

export function bootstrapLoginRateAllowed(request: Request, emailNorm: string): boolean {
  const ip = clientIpFromRequest(request) ?? "unknown";
  const key = `bootstrap:login:${emailNorm}:${ip}`;
  return slidingWindowLimited({
    store: loginStore,
    key,
    max: LOGIN_MAX,
    windowMs: LOGIN_WINDOW_MS,
  });
}

export function bootstrapTotpRateAllowed(request: Request, emailNorm: string): boolean {
  const ip = clientIpFromRequest(request) ?? "unknown";
  const key = `bootstrap:totp:${emailNorm}:${ip}`;
  return slidingWindowLimited({
    store: totpStore,
    key,
    max: TOTP_MAX,
    windowMs: TOTP_WINDOW_MS,
  });
}

export function bootstrapRecoveryRateAllowed(request: Request, emailNorm: string): boolean {
  const ip = clientIpFromRequest(request) ?? "unknown";
  const key = `bootstrap:recovery:${emailNorm}:${ip}`;
  return slidingWindowLimited({
    store: recoveryStore,
    key,
    max: RECOVERY_MAX,
    windowMs: RECOVERY_WINDOW_MS,
  });
}
