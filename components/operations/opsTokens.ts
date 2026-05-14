export type OpsStatusVariant =
  | "queued"
  | "in_progress"
  | "blocked"
  | "exception"
  | "delivered"
  | "scheduled"
  | "awaiting_label"
  | "routing"
  | "picked"
  | "packed"
  | "refunded"
  | "denied"
  | "muted"
  | "open"
  | "closed";

export const opsStatusTone: Record<
  OpsStatusVariant,
  { label: string; className: string }
> = {
  queued: {
    label: "Queued",
    className:
      "border-charcoal/[0.12] bg-charcoal/[0.04] text-charcoal/[0.68] ring-1 ring-inset ring-charcoal/[0.06]",
  },
  in_progress: {
    label: "In progress",
    className: "border-teal-dark/15 bg-teal/[0.06] text-teal-dark/[0.78] ring-1 ring-inset ring-teal/12",
  },
  blocked: {
    label: "Blocked",
    className: "border-gold/38 bg-gold/[0.1] text-espresso/[0.88] ring-1 ring-inset ring-gold/18",
  },
  exception: {
    label: "Exception",
    className:
      "border-red/18 bg-red/[0.07] text-red-dark/[0.82] ring-1 ring-inset ring-red/[0.1]",
  },
  delivered: {
    label: "Delivered",
    className: "border-teal/25 bg-teal/[0.05] text-teal-dark/[0.72]",
  },
  scheduled: {
    label: "Scheduled",
    className: "border-charcoal/[0.1] bg-cream-mid/50 text-charcoal/70 ring-1 ring-inset ring-cream-dark/50",
  },
  awaiting_label: {
    label: "Awaiting label",
    className:
      "border-espresso/[0.12] bg-cream/[0.8] text-espresso/[0.75] ring-1 ring-inset ring-espresso/[0.08]",
  },
  routing: {
    label: "Routing",
    className:
      "border-teal/[0.2] bg-cream/[0.7] text-teal-dark/[0.72] ring-1 ring-inset ring-teal-dark/10",
  },
  picked: {
    label: "Picked",
    className: "border-teal-dark/14 bg-teal/[0.05] text-teal-dark/75",
  },
  packed: {
    label: "Packed",
    className: "border-charcoal/[0.1] bg-cream-dark/35 text-charcoal/68",
  },
  refunded: {
    label: "Refunded",
    className:
      "border-charcoal/[0.12] bg-charcoal/[0.05] text-charcoal/[0.65]",
  },
  denied: {
    label: "Denied",
    className: "border-red/16 bg-red/[0.05] text-red-dark/78",
  },
  muted: {
    label: "Muted",
    className: "border-cream-dark bg-cream/80 text-charcoal/55",
  },
  open: {
    label: "Open",
    className: "border-gold/32 bg-gold/[0.08] text-charcoal/75",
  },
  closed: {
    label: "Closed",
    className:
      "border-charcoal/[0.1] bg-charcoal/[0.03] text-charcoal/[0.55]",
  },
};
