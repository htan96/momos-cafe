/** Shared transactional email shape for Resend / SES adapters. */

export interface TransactionalContent {
  subject: string;
  textBody: string;
  htmlBody: string;
}

export interface SesDispatchContext {
  /** Future: SES message idempotency keys, configuration set, etc. */
  traceId?: string;
}
