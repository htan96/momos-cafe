import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Append-only orchestration / notification queue — workers can consume `processedAt IS NULL` later. */
export async function appendNotificationEvent(
  type: string,
  payload: Prisma.InputJsonValue,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  await db.notificationEvent.create({
    data: { type, payload },
  });
}
