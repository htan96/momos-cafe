import {
  APP_SETTING_MENU_ENABLED,
  APP_SETTING_SHOP_ENABLED,
} from "@/lib/app-settings/constants";
import { ensureDefaultAppSettings } from "@/lib/app-settings/settings";
import {
  GOVERNANCE_CONTROL_DEFINITIONS,
  GOVERNANCE_CONTROL_KEYS,
  governanceControlOperationalStatus,
  governanceControlStatusDescription,
  type GovernanceControlKey,
} from "@/lib/governance/controlKeys";
import { loadLatestGovernanceAuditReasons } from "@/lib/governance/governanceAuditReasons";
import { loadGovernanceControlRowsUncached } from "@/lib/governance/governanceControls";
import {
  detectMaintenanceConflicts,
  type MaintenanceConflict,
  type MaintenanceGateSnapshot,
} from "@/lib/governance/maintenanceConflict";
import type {
  GovernanceEnforcementLayer,
  GovernanceOperationalStatus,
  GovernanceRiskLevel,
} from "@/lib/governance/governanceStatus";
import { ENFORCEMENT_LAYER_LABELS } from "@/lib/governance/governanceStatus";
import {
  PLATFORM_FEATURE_DEFINITIONS,
  PLATFORM_FEATURE_KEYS,
  platformFeatureOperationalStatus,
  platformFeatureStatusDescription,
  type PlatformFeatureKey,
} from "@/lib/platform/governanceFeatures";
import { loadPlatformFeatureStateUncached } from "@/lib/platform/platformFeatureState";
import { prisma } from "@/lib/prisma";

export type GovernanceCapabilityId =
  | "storefront"
  | "orders"
  | "checkout"
  | "customer_registration"
  | "customer_portal"
  | "admin_portal"
  | "email_services"
  | "shipping"
  | "notifications";

export type GovernanceBlockingLayer = {
  layer: GovernanceEnforcementLayer;
  label: string;
  sourceKey: string;
  sourceTitle: string;
};

export type GovernanceControlSnapshot = {
  kind: "governance_control";
  key: GovernanceControlKey;
  title: string;
  category: string;
  status: "ACTIVE" | "BLOCKED";
  statusDescription: string;
  restrictionEnabled: boolean;
  riskLevel: GovernanceRiskLevel;
  enforcementLayers: GovernanceEnforcementLayer[];
  lastModifiedAt: string;
  lastModifiedBy: string | null;
  lastAuditReason: string | null;
};

export type PlatformFeatureSnapshot = {
  kind: "platform_feature";
  key: PlatformFeatureKey;
  title: string;
  status: "ACTIVE" | "DISABLED";
  statusDescription: string;
  featureEnabled: boolean;
  riskLevel: GovernanceRiskLevel;
  enforcementLayers: GovernanceEnforcementLayer[];
  lastModifiedAt: string;
  lastModifiedBy: string | null;
  lastAuditReason: string | null;
};

export type AppSettingGateSnapshot = {
  kind: "app_setting";
  key: "ShopEnabled" | "MenuEnabled";
  title: string;
  status: "ACTIVE" | "BLOCKED";
  statusDescription: string;
  gateEnabled: boolean;
  riskLevel: GovernanceRiskLevel;
  enforcementLayers: GovernanceEnforcementLayer[];
  lastModifiedAt: string | null;
  lastModifiedBy: string | null;
  lastAuditReason: string | null;
};

export type GovernanceCapabilityCard = {
  id: GovernanceCapabilityId;
  title: string;
  status: GovernanceOperationalStatus;
  behavior: string;
  blockingLayers: GovernanceBlockingLayer[];
  enforcementLayers: GovernanceEnforcementLayer[];
  lastModifiedAt: string | null;
  lastModifiedBy: string | null;
  riskLevel: GovernanceRiskLevel;
};

export type GovernanceSnapshot = {
  generatedAt: string;
  controls: GovernanceControlSnapshot[];
  platformFeatures: PlatformFeatureSnapshot[];
  appSettings: AppSettingGateSnapshot[];
  capabilities: GovernanceCapabilityCard[];
  maintenanceConflicts: MaintenanceConflict[];
};

const APP_SETTING_DEFS = {
  ShopEnabled: {
    title: "Retail shop gate",
    activeDescription: "Retail shop surfaces are open to guests.",
    blockedDescription: "Retail shop is closed — maintenance overlay applies.",
  },
  MenuEnabled: {
    title: "Café menu gate",
    activeDescription: "Café menu and kitchen ordering surfaces are open.",
    blockedDescription: "Café menu is closed — maintenance overlay applies.",
  },
} as const;

function layerLabel(layer: GovernanceEnforcementLayer): string {
  return ENFORCEMENT_LAYER_LABELS[layer];
}

function buildControlBlockingLayer(
  key: GovernanceControlKey,
  restrictionEnabled: boolean
): GovernanceBlockingLayer | null {
  if (!restrictionEnabled) return null;
  const def = GOVERNANCE_CONTROL_DEFINITIONS[key];
  return {
    layer: "governance_kill_switch",
    label: layerLabel("governance_kill_switch"),
    sourceKey: key,
    sourceTitle: def.title,
  };
}

function buildAppSettingBlockingLayer(
  key: "ShopEnabled" | "MenuEnabled",
  gateEnabled: boolean
): GovernanceBlockingLayer | null {
  if (gateEnabled) return null;
  return {
    layer: "maintenance_system",
    label: layerLabel("maintenance_system"),
    sourceKey: key,
    sourceTitle: APP_SETTING_DEFS[key].title,
  };
}

function buildFeatureBlockingLayer(
  key: PlatformFeatureKey,
  featureEnabled: boolean
): GovernanceBlockingLayer | null {
  if (featureEnabled) return null;
  const def = PLATFORM_FEATURE_DEFINITIONS[key];
  return {
    layer: "feature_flag",
    label: layerLabel("feature_flag"),
    sourceKey: key,
    sourceTitle: def.title,
  };
}

function worstRisk(levels: GovernanceRiskLevel[]): GovernanceRiskLevel {
  if (levels.includes("high")) return "high";
  if (levels.includes("medium")) return "medium";
  return "low";
}

function latestMeta(dates: (string | null)[], actors: (string | null)[]): {
  lastModifiedAt: string | null;
  lastModifiedBy: string | null;
} {
  let bestDate: string | null = null;
  let bestActor: string | null = null;
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (!d) continue;
    if (!bestDate || d > bestDate) {
      bestDate = d;
      bestActor = actors[i] ?? null;
    }
  }
  return { lastModifiedAt: bestDate, lastModifiedBy: bestActor };
}

function deriveCapabilities(ctx: {
  controlMap: Record<GovernanceControlKey, boolean>;
  shopEnabled: boolean;
  menuEnabled: boolean;
  features: Record<PlatformFeatureKey, boolean>;
  controlSnapshots: GovernanceControlSnapshot[];
  appSnapshots: AppSettingGateSnapshot[];
  featureSnapshots: PlatformFeatureSnapshot[];
}): GovernanceCapabilityCard[] {
  const c = ctx.controlMap;
  const f = ctx.features;

  const defs: {
    id: GovernanceCapabilityId;
    title: string;
    compute: () => {
      status: GovernanceOperationalStatus;
      behavior: string;
      blocking: GovernanceBlockingLayer[];
      layers: GovernanceEnforcementLayer[];
      risks: GovernanceRiskLevel[];
      dates: (string | null)[];
      actors: (string | null)[];
    };
  }[] = [
    {
      id: "storefront",
      title: "Storefront",
      compute: () => {
        const blocking: GovernanceBlockingLayer[] = [];
        const layers = new Set<GovernanceEnforcementLayer>();
        if (c.maintenance_mode || !ctx.shopEnabled) {
          blocking.push(
            ...(c.maintenance_mode
              ? [buildControlBlockingLayer("maintenance_mode", true)!]
              : []),
            ...(!ctx.shopEnabled ? [buildAppSettingBlockingLayer("ShopEnabled", false)!] : [])
          );
          layers.add("governance_kill_switch");
          layers.add("maintenance_system");
          return {
            status: "BLOCKED",
            behavior: "Storefront retail surfaces are unavailable to guests.",
            blocking,
            layers: [...layers],
            risks: ["high"],
            dates: [
              ctx.controlSnapshots.find((x) => x.key === "maintenance_mode")?.lastModifiedAt ?? null,
              ctx.appSnapshots.find((x) => x.key === "ShopEnabled")?.lastModifiedAt ?? null,
            ],
            actors: [
              ctx.controlSnapshots.find((x) => x.key === "maintenance_mode")?.lastModifiedBy ?? null,
              ctx.appSnapshots.find((x) => x.key === "ShopEnabled")?.lastModifiedBy ?? null,
            ],
          };
        }
        if (c.storefront_read_only) {
          blocking.push(buildControlBlockingLayer("storefront_read_only", true)!);
          layers.add("governance_kill_switch");
          return {
            status: "DEGRADED",
            behavior: "Catalog remains visible; commerce writes are blocked.",
            blocking,
            layers: [...layers],
            risks: ["high"],
            dates: [ctx.controlSnapshots.find((x) => x.key === "storefront_read_only")?.lastModifiedAt ?? null],
            actors: [
              ctx.controlSnapshots.find((x) => x.key === "storefront_read_only")?.lastModifiedBy ?? null,
            ],
          };
        }
        if (c.ordering_disabled) {
          blocking.push(buildControlBlockingLayer("ordering_disabled", true)!);
          layers.add("governance_kill_switch");
          return {
            status: "DEGRADED",
            behavior: "Browsing may continue; cart and order mutations are blocked.",
            blocking,
            layers: [...layers],
            risks: ["high"],
            dates: [ctx.controlSnapshots.find((x) => x.key === "ordering_disabled")?.lastModifiedAt ?? null],
            actors: [ctx.controlSnapshots.find((x) => x.key === "ordering_disabled")?.lastModifiedBy ?? null],
          };
        }
        return {
          status: "ACTIVE",
          behavior: "Guests can browse and interact with storefront surfaces.",
          blocking: [],
          layers: ["governance_kill_switch", "maintenance_system"] as GovernanceEnforcementLayer[],
          risks: ["low"],
          dates: [],
          actors: [],
        };
      },
    },
    {
      id: "orders",
      title: "Orders",
      compute: () => {
        const blocking: GovernanceBlockingLayer[] = [];
        if (c.ordering_disabled) blocking.push(buildControlBlockingLayer("ordering_disabled", true)!);
        if (c.storefront_read_only) blocking.push(buildControlBlockingLayer("storefront_read_only", true)!);
        if (c.maintenance_mode) blocking.push(buildControlBlockingLayer("maintenance_mode", true)!);
        if (!ctx.shopEnabled) blocking.push(buildAppSettingBlockingLayer("ShopEnabled", false)!);
        const blocked = blocking.length > 0;
        return {
          status: blocked ? "BLOCKED" : "ACTIVE",
          behavior: blocked
            ? "New orders and cart mutations cannot be placed."
            : "Customers can place and update orders through commerce routes.",
          blocking,
          layers: ["governance_kill_switch", "maintenance_system"],
          risks: blocked ? ["high"] : ["low"],
          dates: blocking.map((b) => {
            const snap = ctx.controlSnapshots.find((x) => x.key === b.sourceKey);
            if (snap) return snap.lastModifiedAt;
            const app = ctx.appSnapshots.find((x) => x.key === b.sourceKey);
            return app?.lastModifiedAt ?? null;
          }),
          actors: blocking.map((b) => {
            const snap = ctx.controlSnapshots.find((x) => x.key === b.sourceKey);
            if (snap) return snap.lastModifiedBy;
            const app = ctx.appSnapshots.find((x) => x.key === b.sourceKey);
            return app?.lastModifiedBy ?? null;
          }),
        };
      },
    },
    {
      id: "checkout",
      title: "Checkout",
      compute: () => {
        const blocking: GovernanceBlockingLayer[] = [];
        if (c.checkout_disabled) blocking.push(buildControlBlockingLayer("checkout_disabled", true)!);
        if (c.ordering_disabled) blocking.push(buildControlBlockingLayer("ordering_disabled", true)!);
        if (c.storefront_read_only) blocking.push(buildControlBlockingLayer("storefront_read_only", true)!);
        if (c.maintenance_mode) blocking.push(buildControlBlockingLayer("maintenance_mode", true)!);
        if (!ctx.shopEnabled) blocking.push(buildAppSettingBlockingLayer("ShopEnabled", false)!);
        const blocked = blocking.length > 0;
        return {
          status: blocked ? "BLOCKED" : "ACTIVE",
          behavior: blocked
            ? GOVERNANCE_CONTROL_DEFINITIONS.checkout_disabled.blockedDescription
            : GOVERNANCE_CONTROL_DEFINITIONS.checkout_disabled.activeDescription,
          blocking,
          layers: ["governance_kill_switch", "maintenance_system"],
          risks: ["high"],
          dates: blocking.map((b) => ctx.controlSnapshots.find((x) => x.key === b.sourceKey)?.lastModifiedAt ?? null),
          actors: blocking.map(
            (b) => ctx.controlSnapshots.find((x) => x.key === b.sourceKey)?.lastModifiedBy ?? null
          ),
        };
      },
    },
    {
      id: "customer_registration",
      title: "Customer registration",
      compute: () => {
        const blocking = c.registrations_disabled
          ? [buildControlBlockingLayer("registrations_disabled", true)!]
          : [];
        return {
          status: c.registrations_disabled ? "BLOCKED" : "ACTIVE",
          behavior: governanceControlStatusDescription("registrations_disabled", c.registrations_disabled),
          blocking,
          layers: ["governance_kill_switch", "authentication_system"] as GovernanceEnforcementLayer[],
          risks: ["high"],
          dates: [ctx.controlSnapshots.find((x) => x.key === "registrations_disabled")?.lastModifiedAt ?? null],
          actors: [
            ctx.controlSnapshots.find((x) => x.key === "registrations_disabled")?.lastModifiedBy ?? null,
          ],
        };
      },
    },
    {
      id: "customer_portal",
      title: "Customer portal",
      compute: () => {
        const blocking = f.customer_platform
          ? []
          : [buildFeatureBlockingLayer("customer_platform", false)!];
        return {
          status: f.customer_platform ? "ACTIVE" : "DISABLED",
          behavior: platformFeatureStatusDescription("customer_platform", f.customer_platform),
          blocking,
          layers: ["feature_flag"],
          risks: ["medium"],
          dates: [ctx.featureSnapshots.find((x) => x.key === "customer_platform")?.lastModifiedAt ?? null],
          actors: [ctx.featureSnapshots.find((x) => x.key === "customer_platform")?.lastModifiedBy ?? null],
        };
      },
    },
    {
      id: "admin_portal",
      title: "Admin portal",
      compute: () => ({
        status: "ACTIVE" as const,
        behavior: "Staff admin surfaces remain available; governance does not close admin HTML routes.",
        blocking: [],
        layers: ["database_configuration"] as GovernanceEnforcementLayer[],
        risks: ["low"] as GovernanceRiskLevel[],
        dates: [],
        actors: [],
      }),
    },
    {
      id: "email_services",
      title: "Email services",
      compute: () => {
        const blocking = f.notifications ? [] : [buildFeatureBlockingLayer("notifications", false)!];
        return {
          status: f.notifications ? "ACTIVE" : "DEGRADED",
          behavior: f.notifications
            ? "Transactional and in-account notification surfacing is enabled."
            : "In-account notification rails are degraded — outbound pipelines may still run.",
          blocking,
          layers: ["feature_flag"],
          risks: ["medium"],
          dates: [ctx.featureSnapshots.find((x) => x.key === "notifications")?.lastModifiedAt ?? null],
          actors: [ctx.featureSnapshots.find((x) => x.key === "notifications")?.lastModifiedBy ?? null],
        };
      },
    },
    {
      id: "shipping",
      title: "Shipping",
      compute: () => {
        const blocking = f.shipment_visibility ? [] : [buildFeatureBlockingLayer("shipment_visibility", false)!];
        return {
          status: f.shipment_visibility ? "ACTIVE" : "DISABLED",
          behavior: platformFeatureStatusDescription("shipment_visibility", f.shipment_visibility),
          blocking,
          layers: ["feature_flag"],
          risks: ["low"],
          dates: [ctx.featureSnapshots.find((x) => x.key === "shipment_visibility")?.lastModifiedAt ?? null],
          actors: [ctx.featureSnapshots.find((x) => x.key === "shipment_visibility")?.lastModifiedBy ?? null],
        };
      },
    },
    {
      id: "notifications",
      title: "Notifications",
      compute: () => {
        const blocking = f.notifications ? [] : [buildFeatureBlockingLayer("notifications", false)!];
        return {
          status: f.notifications ? "ACTIVE" : "DISABLED",
          behavior: platformFeatureStatusDescription("notifications", f.notifications),
          blocking,
          layers: ["feature_flag"],
          risks: ["medium"],
          dates: [ctx.featureSnapshots.find((x) => x.key === "notifications")?.lastModifiedAt ?? null],
          actors: [ctx.featureSnapshots.find((x) => x.key === "notifications")?.lastModifiedBy ?? null],
        };
      },
    },
  ];

  return defs.map((d) => {
    const r = d.compute();
    const meta = latestMeta(r.dates, r.actors);
    return {
      id: d.id,
      title: d.title,
      status: r.status,
      behavior: r.behavior,
      blockingLayers: r.blocking,
      enforcementLayers: r.layers,
      riskLevel: worstRisk(r.risks),
      ...meta,
    };
  });
}

export async function loadGovernanceSnapshot(): Promise<GovernanceSnapshot> {
  await ensureDefaultAppSettings();
  const [controlRows, platformState, appRows, auditReasons] = await Promise.all([
    loadGovernanceControlRowsUncached(),
    loadPlatformFeatureStateUncached(),
    prisma.appSetting.findMany({
      where: { settingId: { in: [APP_SETTING_SHOP_ENABLED, APP_SETTING_MENU_ENABLED] } },
      select: {
        settingId: true,
        enabled: true,
        lastUpdated: true,
        updatedBy: true,
      },
    }),
    loadLatestGovernanceAuditReasons([
      ...GOVERNANCE_CONTROL_KEYS,
      ...PLATFORM_FEATURE_KEYS,
      "ShopEnabled",
      "MenuEnabled",
      "shopEnabled",
      "menuEnabled",
    ]),
  ]);

  const controlMap = {} as Record<GovernanceControlKey, boolean>;
  for (const k of GOVERNANCE_CONTROL_KEYS) controlMap[k] = false;
  for (const row of controlRows) {
    if (GOVERNANCE_CONTROL_KEYS.includes(row.key as GovernanceControlKey)) {
      controlMap[row.key as GovernanceControlKey] = row.enabled;
    }
  }

  const featureMap = {} as Record<PlatformFeatureKey, boolean>;
  for (const k of PLATFORM_FEATURE_KEYS) {
    featureMap[k] = platformState[k].enabled;
  }

  const shopRow = appRows.find((r) => r.settingId === APP_SETTING_SHOP_ENABLED);
  const menuRow = appRows.find((r) => r.settingId === APP_SETTING_MENU_ENABLED);
  const shopEnabled = shopRow?.enabled ?? true;
  const menuEnabled = menuRow?.enabled ?? true;

  const controls: GovernanceControlSnapshot[] = controlRows
    .filter((row) => GOVERNANCE_CONTROL_KEYS.includes(row.key as GovernanceControlKey))
    .map((row) => {
      const key = row.key as GovernanceControlKey;
      const def = GOVERNANCE_CONTROL_DEFINITIONS[key];
      const restrictionEnabled = row.enabled;
      const audit = auditReasons[key];
      return {
        kind: "governance_control" as const,
        key,
        title: def.title,
        category: row.category,
        status: governanceControlOperationalStatus(restrictionEnabled),
        statusDescription: governanceControlStatusDescription(key, restrictionEnabled),
        restrictionEnabled,
        riskLevel: def.riskLevel,
        enforcementLayers: [...def.enforcementLayers],
        lastModifiedAt: row.updatedAt.toISOString(),
        lastModifiedBy: row.lastModifiedBy,
        lastAuditReason: audit?.reason ?? null,
      };
    });

  const platformFeatures: PlatformFeatureSnapshot[] = PLATFORM_FEATURE_KEYS.map((key) => {
    const def = PLATFORM_FEATURE_DEFINITIONS[key];
    const row = platformState[key];
    const featureEnabled = row.enabled;
    const audit = auditReasons[key];
    return {
      kind: "platform_feature" as const,
      key,
      title: def.title,
      status: platformFeatureOperationalStatus(featureEnabled),
      statusDescription: platformFeatureStatusDescription(key, featureEnabled),
      featureEnabled,
      riskLevel: def.riskLevel,
      enforcementLayers: [...def.enforcementLayers],
      lastModifiedAt: row.updatedAt.toISOString(),
      lastModifiedBy: row.updatedBy,
      lastAuditReason: audit?.reason ?? null,
    };
  });

  const appSettings: AppSettingGateSnapshot[] = (
    [
      { key: "ShopEnabled" as const, enabled: shopEnabled, row: shopRow },
      { key: "MenuEnabled" as const, enabled: menuEnabled, row: menuRow },
    ] as const
  ).map(({ key, enabled, row }) => {
    const def = APP_SETTING_DEFS[key];
    const audit = auditReasons[key] ?? auditReasons[key === "ShopEnabled" ? "shopEnabled" : "menuEnabled"];
    return {
      kind: "app_setting" as const,
      key,
      title: def.title,
      status: enabled ? "ACTIVE" : "BLOCKED",
      statusDescription: enabled ? def.activeDescription : def.blockedDescription,
      gateEnabled: enabled,
      riskLevel: "high" as const,
      enforcementLayers: ["maintenance_system"] as GovernanceEnforcementLayer[],
      lastModifiedAt: row?.lastUpdated?.toISOString() ?? null,
      lastModifiedBy: row?.updatedBy ?? null,
      lastAuditReason: audit?.reason ?? null,
    };
  });

  const maintenanceConflicts = detectMaintenanceConflicts({
    governance: {
      maintenance_mode: controlMap.maintenance_mode,
      menu_hidden: controlMap.menu_hidden,
    },
    appSettings: {
      shopEnabled,
      menuEnabled,
      shopUpdatedBy: shopRow?.updatedBy ?? null,
      menuUpdatedBy: menuRow?.updatedBy ?? null,
      shopUpdatedAt: shopRow?.lastUpdated?.toISOString() ?? null,
      menuUpdatedAt: menuRow?.lastUpdated?.toISOString() ?? null,
    } satisfies MaintenanceGateSnapshot,
  });

  const capabilities = deriveCapabilities({
    controlMap,
    shopEnabled,
    menuEnabled,
    features: featureMap,
    controlSnapshots: controls,
    appSnapshots: appSettings,
    featureSnapshots: platformFeatures,
  });

  return {
    generatedAt: new Date().toISOString(),
    controls,
    platformFeatures,
    appSettings,
    capabilities,
    maintenanceConflicts,
  };
}
