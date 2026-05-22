/**
 * Lightweight reads for inbound `EmailMessage.rawPayload.momosOperational` (ops UI).
 */
export function readInboundOperationalFlags(rawPayload: unknown): {
  quarantine: boolean;
  reason?: string;
  transport?: string;
} {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return { quarantine: false };
  }
  const mom = (rawPayload as Record<string, unknown>).momosOperational;
  if (!mom || typeof mom !== "object" || Array.isArray(mom)) {
    return { quarantine: false };
  }
  const m = mom as Record<string, unknown>;
  if (m.quarantine !== true) return { quarantine: false };
  return {
    quarantine: true,
    ...(typeof m.reason === "string" ? { reason: m.reason } : {}),
    ...(typeof m.transport === "string" ? { transport: m.transport } : {}),
  };
}
