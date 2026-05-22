/** Shared transactional email shape for SES adapters (historic rows may reference legacy providers). */

export interface TransactionalContent {
  subject: string;
  textBody: string;
  htmlBody: string;
}

export interface SesDispatchContext {
  /** Future: SES message idempotency keys, configuration set, etc. */
  traceId?: string;
}
