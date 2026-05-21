import type { OperationalActivityEvent } from "@prisma/client";
import {
  buildOperationalMetadataJumpLinks,
  readOperationalMetadataEntityIds,
} from "@/lib/operations/operationalContextLinks";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { isPlatformEventMetadataV1 } from "@/lib/platform/events/metadata";
import type { PlatformEventCategory } from "@/lib/platform/events/taxonomy";
import type {
  LiveActivityEvent,
  LiveActivityEventKind,
  LiveActivityEventLinks,
  LiveActivitySeverity,
} from "./types";

const ADMIN_ACTOR_TYPES = new Set(["admin", "super_admin"]);

function mapSeverity(sev: OperationalActivityEvent["severity"]): LiveActivitySeverity {
  switch (sev) {
    case "info":
      return "info";
    case "warning":
      return "warning";
    case "error":
      return "error";
    case "critical":
      return "critical";
    default:
      return "info";
  }
}

function categoryFromLegacyType(type: string): PlatformEventCategory {
  if (type.startsWith("order.") || type.startsWith("catering.")) return "ORDER_EVENT";
  if (type.startsWith("payment.")) return "PAYMENT_EVENT";
  if (type.startsWith("shipment.")) return "SHIPMENT_EVENT";
  if (type.startsWith("auth.") || type.startsWith("presence.")) return "AUTH_EVENT";
  if (type.startsWith("menu.")) return "MENU_EVENT";
  if (type.startsWith("security.")) return "SECURITY_EVENT";
  if (type.startsWith("governance.") || type.startsWith("platform.") || type.startsWith("maintenance.")) {
    return "SYSTEM_EVENT";
  }
  if (type.startsWith("customer.")) return "ORDER_EVENT";
  if (type.startsWith("access.") || type.startsWith("user.")) return "SYSTEM_EVENT";
  if (type.startsWith("system.")) return "SYSTEM_EVENT";
  return "SYSTEM_EVENT";
}

function resolveCategory(row: OperationalActivityEvent): PlatformEventCategory {
  const meta = row.metadata;
  if (isPlatformEventMetadataV1(meta)) return meta.category;
  return categoryFromLegacyType(row.type);
}

function mapCategoryToKind(category: PlatformEventCategory, row: OperationalActivityEvent): LiveActivityEventKind {
  if (category === "SHIPMENT_EVENT") return "DELIVERY_EVENT";
  if (category === "MENU_EVENT") return "SYSTEM_EVENT";
  if (category === "ORDER_EVENT") return "ORDER_EVENT";
  if (category === "PAYMENT_EVENT") return "PAYMENT_EVENT";
  if (category === "AUTH_EVENT") return "AUTH_EVENT";
  if (category === "SECURITY_EVENT") return "SECURITY_EVENT";
  if (category === "INCIDENT_EVENT") return "INCIDENT_EVENT";
  if (category === "SYSTEM_EVENT") {
    if (
      row.type === OPERATIONAL_EVENT_TYPES.GOVERNANCE_CONTROL_UPDATED ||
      row.type === OPERATIONAL_EVENT_TYPES.PLATFORM_FEATURE_TOGGLED ||
      row.type === OPERATIONAL_EVENT_TYPES.MAINTENANCE_UPDATED ||
      row.type === OPERATIONAL_EVENT_TYPES.USER_ROLE_CHANGED ||
      row.type === OPERATIONAL_EVENT_TYPES.ADMIN_PROMOTED ||
      row.type === OPERATIONAL_EVENT_TYPES.ADMIN_DEMOTED
    ) {
      return "ADMIN_EVENT";
    }
    if (row.type === OPERATIONAL_EVENT_TYPES.CUSTOMER_REGISTERED) return "CUSTOMER_EVENT";
    return "SYSTEM_EVENT";
  }
  if (ADMIN_ACTOR_TYPES.has(row.actorType)) return "ADMIN_EVENT";
  if (row.actorType === "customer") return "CUSTOMER_EVENT";
  return "SYSTEM_EVENT";
}

function buildLinks(row: OperationalActivityEvent): LiveActivityEventLinks | undefined {
  const { commerceOrderId, orderId, customerId, shipmentId } = readOperationalMetadataEntityIds(row.metadata);
  const primaryOrderId = commerceOrderId ?? orderId;
  const links: LiveActivityEventLinks = {};
  if (primaryOrderId) links.orderId = primaryOrderId;
  if (customerId) {
    links.customerId = customerId;
    links.userId = customerId;
  }
  if (shipmentId) links.shipmentId = shipmentId;
  if (ADMIN_ACTOR_TYPES.has(row.actorType) && row.actorId) links.adminId = row.actorId;
  return Object.keys(links).length > 0 ? links : undefined;
}

function actorLabel(row: OperationalActivityEvent): string | null {
  const parts = [row.actorType, row.actorName, row.actorId ? `id:${row.actorId.slice(0, 12)}` : null, row.source]
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Maps a persisted `OperationalActivityEvent` row into the Live Activity UI model.
 */
export function mapPlatformEventToLiveActivity(
  row: OperationalActivityEvent,
  incidentIdsByEventId?: ReadonlyMap<string, string[]>
): LiveActivityEvent {
  const category = resolveCategory(row);
  const kind = mapCategoryToKind(category, row);
  const links = buildLinks(row);
  const jumpLinks = buildOperationalMetadataJumpLinks(row.metadata);
  const incidentIds = incidentIdsByEventId?.get(row.id);

  const base = {
    id: row.id,
    severity: mapSeverity(row.severity),
    occurredAt: row.createdAt.toISOString(),
    summary: row.message,
    subtype: row.type,
    links,
    jumpLinks: jumpLinks.length > 0 ? jumpLinks : undefined,
    source: row.source,
    actorLabel: actorLabel(row),
    incidentIds: incidentIds && incidentIds.length > 0 ? incidentIds : undefined,
  };

  switch (kind) {
    case "ORDER_EVENT":
      return { ...base, kind, detail: row.type };
    case "PAYMENT_EVENT":
      return { ...base, kind, detail: row.type };
    case "AUTH_EVENT":
      return { ...base, kind, detail: row.type };
    case "ADMIN_EVENT":
      return { ...base, kind, detail: row.type };
    case "CUSTOMER_EVENT":
      return { ...base, kind, detail: row.type };
    case "DELIVERY_EVENT":
      return { ...base, kind, detail: row.type };
    case "SECURITY_EVENT":
      return { ...base, kind, detail: row.type };
    case "INCIDENT_EVENT":
      return { ...base, kind, detail: row.type };
    case "SYSTEM_EVENT":
    default:
      return { ...base, kind: "SYSTEM_EVENT", detail: row.type };
  }
}
