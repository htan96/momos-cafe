export const CATERING_REQUEST_STATUSES = [
  "inquiry",
  "quoted",
  "confirmed",
  "in_prep",
  "completed",
  "cancelled",
] as const;

export type CateringRequestStatus = (typeof CATERING_REQUEST_STATUSES)[number];

export type CateringRequestTransitionEdge = Readonly<{
  from: CateringRequestStatus;
  to: CateringRequestStatus;
  actor: "customer" | "sales" | "kitchen" | "system";
}>;

export const CATERING_REQUEST_TRANSITIONS: readonly CateringRequestTransitionEdge[] = [
  { from: "inquiry", to: "quoted", actor: "sales" },
  { from: "quoted", to: "confirmed", actor: "customer" },
  { from: "confirmed", to: "in_prep", actor: "kitchen" },
  { from: "in_prep", to: "completed", actor: "kitchen" },
  { from: "inquiry", to: "cancelled", actor: "customer" },
  { from: "quoted", to: "cancelled", actor: "sales" },
];
