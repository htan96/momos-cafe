import { OperationalActivitySeverity } from "@prisma/client";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

/**
 * Parsed carrier webhook signal — maps to taxonomy `shipment.*` subtypes (`emitPlatformEvent` normalizes casing).
 *
 * INTERNAL enum names → external dotted subtypes (`PLATFORM_EVENT_SUBTYPE`).
 */
export type NormalizedShippoShipmentSignal =
  | "SHIPMENT_TRACKING_UPDATED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION"
  | "RETURNED"
  | "FAILURE";

export type PlatformSignalMapping = {
  signal: NormalizedShippoShipmentSignal;
  subtype: (typeof PLATFORM_EVENT_SUBTYPE)[keyof typeof PLATFORM_EVENT_SUBTYPE];
  /** Coarse lifecycle for envelope */
  lifecycle: "started" | "processing" | "succeeded" | "failed" | "compensated" | "cancelled";
  severity: OperationalActivitySeverity;
  /** Suggested persisted `Shipment.status` when present */
  shipmentStatus?: string;
};

const DEFAULT_UPDATE: PlatformSignalMapping = {
  signal: "SHIPMENT_TRACKING_UPDATED",
  subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_TRACKING_UPDATED,
  lifecycle: "processing",
  severity: OperationalActivitySeverity.info,
};

/**
 * Align with `domains/shipping/lifecycle` vocabulary where possible (`Shipment.status` string bucket).
 *
 * Carrier tokens are uppercased for comparison (Shippo publishes uppercase enums).
 */
export function mapShippoTrackingStatusToSignal(statusUpper?: string | null): PlatformSignalMapping {
  const s = (statusUpper ?? "").trim().toUpperCase();
  if (!s) return DEFAULT_UPDATE;

  switch (s) {
    case "DELIVERED":
      return {
        signal: "DELIVERED",
        subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_DELIVERED,
        lifecycle: "succeeded",
        severity: OperationalActivitySeverity.info,
        shipmentStatus: "delivered",
      };
    case "TRANSIT":
      return {
        signal: "IN_TRANSIT",
        subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_IN_TRANSIT,
        lifecycle: "processing",
        severity: OperationalActivitySeverity.info,
        shipmentStatus: "in_transit",
      };
    case "UNKNOWN":
      return DEFAULT_UPDATE;
    case "PRE_TRANSIT":
      return {
        signal: "SHIPMENT_TRACKING_UPDATED",
        subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_TRACKING_UPDATED,
        lifecycle: "started",
        severity: OperationalActivitySeverity.info,
        shipmentStatus: "manifested",
      };
    case "OUT_FOR_DELIVERY":
    case "PICKUP_READY":
      return {
        signal: "OUT_FOR_DELIVERY",
        subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_OUT_FOR_DELIVERY,
        lifecycle: "processing",
        severity: OperationalActivitySeverity.info,
        shipmentStatus: "out_for_delivery",
      };
    case "FAILURE":
    case "DELIVERY_EXCEPTION":
      return {
        signal: "FAILURE",
        subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_FAILURE,
        lifecycle: "failed",
        severity: OperationalActivitySeverity.error,
        shipmentStatus: "exception",
      };
    case "EXCEPTION":
      return {
        signal: "EXCEPTION",
        subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_EXCEPTION,
        lifecycle: "failed",
        severity: OperationalActivitySeverity.warning,
        shipmentStatus: "exception",
      };
    case "RETURNED_TO_SENDER":
    case "RETURN_EXCEPTION":
      return {
        signal: "RETURNED",
        subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_RETURNED,
        lifecycle: "compensated",
        severity: OperationalActivitySeverity.warning,
        shipmentStatus: "return_initiated",
      };
    default:
      if (s.includes("RETURN")) {
        return {
          signal: "RETURNED",
          subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_RETURNED,
          lifecycle: "compensated",
          severity: OperationalActivitySeverity.warning,
          shipmentStatus: "return_initiated",
        };
      }
      if (s.includes("FAIL") || s.includes("DENIED")) {
        return {
          signal: "FAILURE",
          subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_FAILURE,
          lifecycle: "failed",
          severity: OperationalActivitySeverity.error,
          shipmentStatus: "exception",
        };
      }
      return DEFAULT_UPDATE;
  }
}
