/**
 * Matches future `NotificationEvent` rows that enqueue transactional outbound email.
 * Use `notificationTypeSupportsOutboundEmail` in the outbox processor before delegating to `deliverOutboundEmail`.
 */
export function notificationTypeSupportsOutboundEmail(type: string): boolean {
  if (!type.trim()) return false;
  if (type.startsWith("email.transactional.")) return true;
  return false;
}
