export type RefundDomainEvent =
  | { domain: "refunds"; name: "case.opened"; caseId: string; orderId: string }
  | { domain: "refunds"; name: "case.resolved"; caseId: string; status: string };
