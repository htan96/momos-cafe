import type { Prisma } from "@prisma/client";
import { OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";

/** UUID v4 shape — matches super-admin ops route guards. */
export const OPS_ENTITY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OperationalMetadataJumpLink = { href: string; label: string };

const CATERING_INQUIRY_METADATA_KEYS = [
  "cateringInquiryId",
  "catering_inquiry_id",
  "cateringRequestId",
  "catering_request_id",
] as const;

function readUuidFromRecord(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "string") {
      const t = v.trim();
      if (t && OPS_ENTITY_UUID_RE.test(t)) return t;
    }
  }
  return null;
}

/** Flat string keys commonly written on `OperationalActivityEvent.metadata` / incident metadata. */
export function readOperationalMetadataEntityIds(metadata: unknown): {
  commerceOrderId: string | null;
  orderId: string | null;
  customerId: string | null;
  shipmentId: string | null;
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { commerceOrderId: null, orderId: null, customerId: null, shipmentId: null };
  }
  const o = metadata as Record<string, unknown>;
  const commerceOrderId = readUuidFromRecord(o, ["commerceOrderId", "commerce_order_id"]);
  const orderId = readUuidFromRecord(o, ["orderId", "order_id"]);
  const customerId = readUuidFromRecord(o, ["customerId", "customer_id"]);
  const shipmentId = readUuidFromRecord(o, ["shipmentId", "shipment_id"]);
  return { commerceOrderId, orderId, customerId, shipmentId };
}

export function buildOperationalMetadataJumpLinks(metadata: unknown): OperationalMetadataJumpLink[] {
  const { commerceOrderId, orderId, customerId, shipmentId } = readOperationalMetadataEntityIds(metadata);
  const links: OperationalMetadataJumpLink[] = [];

  const primaryOrderId = commerceOrderId ?? orderId;
  if (primaryOrderId) {
    links.push({ href: `/super-admin/order-operations/${primaryOrderId}`, label: "Open order" });
  }

  if (customerId) {
    links.push({ href: `/super-admin/customer-operations/${customerId}`, label: "Open customer" });
  }

  if (shipmentId) {
    links.push({ href: `/super-admin/shipping-operations/${shipmentId}`, label: "Open shipment" });
  }

  return links;
}

export function readCateringInquiryIdFromCommerceMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return readUuidFromRecord(metadata as Record<string, unknown>, CATERING_INQUIRY_METADATA_KEYS);
}

export function operationalIncidentWhereForOrder(orderId: string): Prisma.OperationalIncidentWhereInput {
  const shortHint = orderId.slice(0, 8);
  return {
    AND: [
      { status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
      {
        OR: [
          { metadata: { path: ["commerceOrderId"], equals: orderId } },
          { metadata: { path: ["orderId"], equals: orderId } },
          { title: { contains: shortHint, mode: "insensitive" } },
          { description: { contains: shortHint, mode: "insensitive" } },
        ],
      },
    ],
  };
}

export function operationalIncidentWhereForCustomer(customerId: string, emailTrim: string | null): Prisma.OperationalIncidentWhereInput {
  const shortHint = customerId.slice(0, 8);
  const or: Prisma.OperationalIncidentWhereInput[] = [
    { metadata: { path: ["customerId"], equals: customerId } },
    { title: { contains: shortHint, mode: "insensitive" } },
    { description: { contains: shortHint, mode: "insensitive" } },
  ];

  if (emailTrim) {
    const lower = emailTrim.toLowerCase();
    or.push({ metadata: { path: ["targetEmail"], equals: lower } });
    if (lower !== emailTrim) {
      or.push({ metadata: { path: ["targetEmail"], equals: emailTrim } });
    }
  }

  return {
    AND: [{ status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } }, { OR: or }],
  };
}
