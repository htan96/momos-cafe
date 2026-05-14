export const SUPPORT_TICKET_STATUSES = [
  "open",
  "triaged",
  "in_progress",
  "waiting_on_customer",
  "waiting_on_partner",
  "escalated",
  "resolved",
  "closed",
] as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export type SupportTicketTransitionEdge = Readonly<{
  from: SupportTicketStatus;
  to: SupportTicketStatus;
  actor: "customer" | "agent" | "system";
}>;

export const SUPPORT_TICKET_TRANSITIONS: readonly SupportTicketTransitionEdge[] = [
  { from: "open", to: "triaged", actor: "system" },
  { from: "triaged", to: "in_progress", actor: "agent" },
  { from: "in_progress", to: "waiting_on_customer", actor: "agent" },
  { from: "waiting_on_customer", to: "in_progress", actor: "customer" },
  { from: "in_progress", to: "escalated", actor: "agent" },
  { from: "escalated", to: "in_progress", actor: "agent" },
  { from: "in_progress", to: "resolved", actor: "agent" },
  { from: "resolved", to: "closed", actor: "system" },
];

export const ESCALATION_LEVELS = ["L1", "L2", "L3_ENGINEERING"] as const;

export type EscalationLevel = (typeof ESCALATION_LEVELS)[number];
