/**
 * Very small fixed-window rate limiter for Node route handlers (PM2 single-process friendly).
 * Not suitable for multi-instance without Redis — adequate as first-line throttle on EC2 fork mode.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function rateLimitHit(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, b);
    return false;
  }
  b.count += 1;
  return b.count > opts.max;
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
