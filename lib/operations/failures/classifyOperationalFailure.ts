import type { OperationalActivitySeverity } from "@prisma/client";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import {
  FAILURE_TYPE_CATEGORY,
  isOperationalFailureType,
  type OperationalFailureType,
} from "@/lib/operations/failures/failureSubtypes";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import type { PlatformEventCategory } from "@/lib/platform/events/taxonomy";
import { isPlatformEventMetadataV1 } from "@/lib/platform/events/metadata";

export type OperationalPriority = "low" | "medium" | "high" | "urgent";

export type CustomerImpact = "none" | "single" | "multi" | "widespread";

export type OperationalFailureClassification = {
  subtype: string;
  category: PlatformEventCategory | "UNKNOWN";
  severity: OperationalActivitySeverity;
  retryable: boolean;
  escalationEligible: boolean;
  incidentEligible: boolean;
  customerImpact: CustomerImpact;
  operationalPriority: OperationalPriority;
};

type ClassificationDefaults = Omit<OperationalFailureClassification, "subtype" | "category">;

const DEFAULTS: ClassificationDefaults = {
  severity: "warning",
  retryable: false,
  escalationEligible: false,
  incidentEligible: true,
  customerImpact: "single",
  operationalPriority: "medium",
};

const BY_TYPE: Partial<Record<OperationalFailureType, Partial<ClassificationDefaults>>> = {
  [OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED]: {
    severity: "error",
    retryable: true,
    escalationEligible: true,
    customerImpact: "single",
    operationalPriority: "high",
  },
  [PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED]: {
    severity: "error",
    retryable: true,
    escalationEligible: true,
    customerImpact: "multi",
    operationalPriority: "urgent",
  },
  [PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK]: {
    severity: "warning",
    retryable: true,
    escalationEligible: false,
    customerImpact: "none",
    operationalPriority: "medium",
  },
  [PLATFORM_EVENT_SUBTYPE.PAYMENT_REGISTER_FAILED]: {
    severity: "error",
    retryable: true,
    escalationEligible: true,
    customerImpact: "single",
    operationalPriority: "high",
  },
  [PLATFORM_EVENT_SUBTYPE.SHIPMENT_QUOTE_FAILED]: {
    severity: "warning",
    retryable: true,
    escalationEligible: false,
    customerImpact: "single",
    operationalPriority: "medium",
  },
  [PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_FAILED]: {
    severity: "error",
    retryable: true,
    escalationEligible: true,
    customerImpact: "single",
    operationalPriority: "high",
  },
  [PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED]: {
    severity: "warning",
    retryable: false,
    escalationEligible: false,
    incidentEligible: true,
    customerImpact: "single",
    operationalPriority: "low",
  },
  [PLATFORM_EVENT_SUBTYPE.SYSTEM_INTEGRATION_DEGRADED]: {
    severity: "error",
    retryable: false,
    escalationEligible: true,
    customerImpact: "widespread",
    operationalPriority: "urgent",
  },
  [PLATFORM_EVENT_SUBTYPE.ORDER_DRAFT_CREATE_FAILED]: {
    severity: "error",
    retryable: true,
    escalationEligible: true,
    customerImpact: "single",
    operationalPriority: "high",
  },
  [PLATFORM_EVENT_SUBTYPE.MENU_SYNC_FAILED]: {
    severity: "warning",
    retryable: true,
    escalationEligible: true,
    customerImpact: "widespread",
    operationalPriority: "high",
  },
  [PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_SEND_FAILED]: {
    severity: "warning",
    retryable: true,
    escalationEligible: false,
    customerImpact: "single",
    operationalPriority: "medium",
  },
  [PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_FAILED]: {
    severity: "warning",
    retryable: false,
    escalationEligible: false,
    customerImpact: "none",
    operationalPriority: "low",
  },
  [PLATFORM_EVENT_SUBTYPE.SECURITY_WEBHOOK_SIGNATURE_INVALID]: {
    severity: "critical",
    retryable: false,
    escalationEligible: true,
    incidentEligible: true,
    customerImpact: "multi",
    operationalPriority: "urgent",
  },
  [OPERATIONAL_EVENT_TYPES.CATERING_INQUIRY_FAILED]: {
    severity: "error",
    retryable: true,
    escalationEligible: false,
    customerImpact: "single",
    operationalPriority: "medium",
  },
};

export function classifyOperationalFailure(args: {
  type: string;
  persistedSeverity: OperationalActivitySeverity;
  metadata: unknown;
}): OperationalFailureClassification {
  const subtype = args.type.trim().toLowerCase();
  const typeDefaults = isOperationalFailureType(subtype) ? BY_TYPE[subtype] : undefined;
  const merged = { ...DEFAULTS, ...typeDefaults };

  let category: PlatformEventCategory | "UNKNOWN" = "UNKNOWN";
  if (isOperationalFailureType(subtype)) {
    category = FAILURE_TYPE_CATEGORY[subtype];
  }
  if (isPlatformEventMetadataV1(args.metadata) && args.metadata.category) {
    category = args.metadata.category;
  }

  const severity =
    args.persistedSeverity === "info" && merged.severity !== "info"
      ? merged.severity
      : args.persistedSeverity;

  return {
    subtype,
    category,
    severity,
    retryable: merged.retryable,
    escalationEligible: merged.escalationEligible,
    incidentEligible: merged.incidentEligible,
    customerImpact: merged.customerImpact,
    operationalPriority: merged.operationalPriority,
  };
}

export type ClassificationBadgeKey =
  | "retryable"
  | "escalationEligible"
  | "incidentEligible"
  | "customerImpact"
  | "operationalPriority";

export function classificationBadges(
  c: OperationalFailureClassification
): { key: ClassificationBadgeKey; label: string; tone: "neutral" | "warning" | "critical" }[] {
  const badges: { key: ClassificationBadgeKey; label: string; tone: "neutral" | "warning" | "critical" }[] = [];

  if (c.retryable) badges.push({ key: "retryable", label: "Retryable", tone: "neutral" });
  if (c.escalationEligible) badges.push({ key: "escalationEligible", label: "Escalate", tone: "warning" });
  if (c.incidentEligible) badges.push({ key: "incidentEligible", label: "Incident-eligible", tone: "neutral" });
  if (c.customerImpact !== "none") {
    badges.push({
      key: "customerImpact",
      label: `Impact: ${c.customerImpact}`,
      tone: c.customerImpact === "widespread" ? "critical" : "warning",
    });
  }
  badges.push({
    key: "operationalPriority",
    label: `Priority: ${c.operationalPriority}`,
    tone: c.operationalPriority === "urgent" ? "critical" : "neutral",
  });

  return badges;
}
