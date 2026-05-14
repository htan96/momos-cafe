/** Shippo-style outbound shipment coarse lifecycle — maps to Shipment rows over time. */
export const SHIPMENT_STATUSES = [
  "pending",
  "label_purchasing",
  "label_created",
  "manifested",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
  "cancelled",
  "return_initiated",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export type ShipmentTransitionEdge = Readonly<{
  from: ShipmentStatus;
  to: ShipmentStatus;
  actor: "system" | "carrier" | "admin";
}>;

export const SHIPMENT_TRANSITIONS: readonly ShipmentTransitionEdge[] = [
  { from: "pending", to: "label_purchasing", actor: "system" },
  { from: "label_purchasing", to: "label_created", actor: "system" },
  { from: "label_created", to: "manifested", actor: "system" },
  { from: "manifested", to: "in_transit", actor: "carrier" },
  { from: "in_transit", to: "out_for_delivery", actor: "carrier" },
  { from: "out_for_delivery", to: "delivered", actor: "carrier" },
  { from: "pending", to: "cancelled", actor: "admin" },
  { from: "label_created", to: "exception", actor: "carrier" },
  { from: "in_transit", to: "exception", actor: "carrier" },
  { from: "delivered", to: "return_initiated", actor: "system" },
];
