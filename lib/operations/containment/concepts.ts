/**
 * ## Operational “quarantine” (conceptual only)
 *
 * In mature incident response, **quarantine** is often a deliberate **operator state**: “stop treating
 * this slice of traffic/data as authoritative until a human verifies it.” Momos does **not** persist
 * a platform-level quarantine ledger today, and automated quarantine/freeze actions are explicitly
 * **out of scope** for containment signals.
 *
 * These recommendations are therefore **advisory**: they summarize already-computed drift and replay
 * pressure so responders can decide whether to impose manual safeguards (freeze checkout, pause a
 * campaign, escalate to PSP, etc.) through existing governance and order-operations tooling.
 *
 * When first-class manual “mark quarantined” UX exists, it can reuse these same kinds without changing
 * the meaning of signals: telemetry → visibility → **human** platform action only.
 */

export const OPERATOR_QUARANTINE_CONCEPT_NOTE =
  "Quarantine here means an operator-held stance (verify before trusting), not a DB flag or cron-enforced halt.";
