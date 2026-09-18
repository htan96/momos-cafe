import { OperationalActivitySeverity, type Prisma } from "@prisma/client";

import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";

export async function emitBootstrapOperationalEvent(params: {
  type: (typeof OPERATIONAL_EVENT_TYPES)[keyof typeof OPERATIONAL_EVENT_TYPES];
  message: string;
  metadata?: Prisma.InputJsonValue;
  severity?: OperationalActivitySeverity;
}): Promise<void> {
  await emitOperationalEvent({
    type: params.type,
    severity: params.severity ?? OperationalActivitySeverity.info,
    actorType: "super_admin",
    actorId: "bootstrap-admin",
    message: params.message,
    metadata: params.metadata,
    source: "bootstrap.auth",
  });
}
