import { truncateUtf8 } from "@/lib/presence/truncate";

const IP_MAX = 64;
const UA_MAX = 512;

export function clientIpFromRequest(request: Request): string | null {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return truncateUtf8(first, IP_MAX);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return truncateUtf8(real, IP_MAX);
  return null;
}

export function userAgentFromRequest(request: Request): string | null {
  const ua = request.headers.get("user-agent");
  if (!ua) return null;
  return truncateUtf8(ua, UA_MAX);
}
