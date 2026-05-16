/** Truncate request metadata for `ImpersonationSupportSession` columns. */
export function truncateImpersonationIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  return t.length <= 64 ? t : t.slice(0, 64);
}

export function truncateImpersonationUserAgent(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  return t.length <= 512 ? t : t.slice(0, 512);
}

export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return truncateImpersonationIp(first);
  }
  const real = request.headers.get("x-real-ip");
  return truncateImpersonationIp(real?.trim() ?? null);
}

export function userAgentFromRequest(request: Request): string | null {
  return truncateImpersonationUserAgent(request.headers.get("user-agent"));
}
