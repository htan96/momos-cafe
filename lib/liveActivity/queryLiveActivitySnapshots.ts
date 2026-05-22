import { DateTime } from "luxon";
import { WebhookProcessingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AUTH_FAILURE_THRESHOLD,
  OPERATIONAL_RULE_WINDOW_MS,
  WEBHOOK_FAILURE_TYPES,
} from "@/lib/operations/incidentDetection";
import { OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { INTEGRATION_HEALTH_DISPLAY_ORDER } from "@/lib/operations/integrationHealth/types";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import type { LiveActivitySnapshotsResponse } from "./types";

const DEFAULT_RESTAURANT_TZ = "America/Los_Angeles";

function startOfTodayUtcForRestaurant(): Date {
  const tz = process.env.RESTAURANT_TIMEZONE?.trim() || DEFAULT_RESTAURANT_TZ;
  return DateTime.now().setZone(tz).startOf("day").toUTC().toJSDate();
}

export async function queryLiveActivitySnapshots(): Promise<LiveActivitySnapshotsResponse> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - OPERATIONAL_RULE_WINDOW_MS);
  const todayStart = startOfTodayUtcForRestaurant();

  const [
    activeIncidents,
    healthRows,
    failedPaymentsToday,
    webhookFailuresCount,
    authFailureCount,
    notificationBacklog,
    lateOrStuckFulfillment,
    pendingOrchestrationEvents,
    orphanWebhookReceiptWindowCount,
  ] = await Promise.all([
    prisma.operationalIncident.findMany({
      where: { status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
      orderBy: { lastDetectedAt: "desc" },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        title: true,
        lastDetectedAt: true,
      },
    }),
    prisma.integrationHealthSnapshot.findMany({
      where: { systemKey: { in: [...INTEGRATION_HEALTH_DISPLAY_ORDER] } },
    }),
    prisma.operationalActivityEvent.count({
      where: {
        type: { in: [OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED, PLATFORM_EVENT_SUBTYPE.PAYMENT_REGISTER_FAILED] },
        createdAt: { gte: todayStart },
      },
    }),
    prisma.operationalActivityEvent.count({
      where: {
        type: { in: [...WEBHOOK_FAILURE_TYPES] },
        createdAt: { gte: windowStart },
      },
    }),
    prisma.operationalActivityEvent.count({
      where: {
        type: PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED,
        createdAt: { gte: windowStart },
      },
    }),
    prisma.notificationEvent.count({ where: { processedAt: null } }),
    prisma.fulfillmentGroup.count({
      where: {
        status: { notIn: ["completed", "cancelled"] },
        order: {
          status: { in: ["paid", "partially_fulfilled"] },
          updatedAt: { lt: new Date(now.getTime() - 36 * 60 * 60 * 1000) },
        },
      },
    }),
    prisma.notificationEvent.count({ where: { processedAt: null } }),
    prisma.webhookDeliveryReceipt.count({
      where: {
        provider: "square",
        processingStatus: WebhookProcessingStatus.failed,
        errorCode: "ORPHAN_NO_LOCAL_PAYMENT",
        receivedAt: { gte: windowStart },
      },
    }),
  ]);

  const degradedIntegrations = healthRows
    .filter((r) => r.currentStatus === "degraded" || r.currentStatus === "offline" || r.currentStatus === "recovering")
    .map((r) => ({
      systemKey: r.systemKey,
      currentStatus: r.currentStatus,
      lastErrorMessage: r.lastErrorMessage,
    }));

  return {
    fetchedAt: now.toISOString(),
    activeIncidents: {
      count: activeIncidents.length,
      top: activeIncidents.slice(0, 3).map((row) => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        status: row.status,
        title: row.title,
        lastDetectedAt: row.lastDetectedAt?.toISOString() ?? null,
      })),
    },
    degradedIntegrations,
    failedPaymentsToday,
    webhookFailuresCount,
    authFailureSpike: {
      count: authFailureCount,
      threshold: AUTH_FAILURE_THRESHOLD,
      elevated: authFailureCount >= AUTH_FAILURE_THRESHOLD,
    },
    notificationBacklog,
    queueHealth: {
      lateOrStuckFulfillment,
      pendingOrchestrationEvents,
    },
    orphanWebhookReceiptWindowCount,
  };
}
