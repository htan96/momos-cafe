/**
 * Backfill `users` from Cognito pool groups (customer, admin, super_admin).
 *
 * Usage (from repo root):
 *   npx tsx scripts/backfill-users-from-cognito.ts
 *
 * Requires DATABASE_URL and Cognito admin env (same as app).
 */
import { getCognitoConfig } from "../lib/auth/cognito/config";
import {
  adminListUsersInPoolGroup,
  adminListAssignedGroupsForUser,
} from "../lib/auth/cognito/adminPoolDirectory";
import { deriveAccountRoleFromGroups } from "../lib/accountManagement/deriveAccountRole";
import { accountMgmtRoleToUserRole } from "../lib/auth/userAuthority";
import { prisma } from "../lib/prisma";

async function main() {
  const cfg = getCognitoConfig();
  if (!cfg) {
    console.error("Cognito not configured — set COGNITO_* env vars.");
    process.exit(1);
  }

  const groupNames = ["customer", "admin", "super_admin"] as const;
  const seen = new Map<string, { email: string | null; role: ReturnType<typeof accountMgmtRoleToUserRole> }>();

  for (const group of groupNames) {
    const listed = await adminListUsersInPoolGroup(cfg, group);
    for (const u of listed) {
      const groups = await adminListAssignedGroupsForUser(cfg, u.username);
      const role = accountMgmtRoleToUserRole(deriveAccountRoleFromGroups(groups));
      const prev = seen.get(u.sub);
      if (!prev || rankRole(role) > rankRole(prev.role)) {
        seen.set(u.sub, { email: u.email?.trim().toLowerCase() ?? null, role });
      }
    }
    console.info(`[backfill] scanned group ${group}: ${listed.length} users`);
  }

  let upserted = 0;
  for (const [cognitoSub, meta] of seen) {
    let customerId: string | null = null;
    if (meta.email) {
      const cust = await prisma.customer.findFirst({
        where: { externalAuthSubject: cognitoSub },
        select: { id: true },
      });
      if (cust) customerId = cust.id;
      else {
        const byEmail = await prisma.customer.findFirst({
          where: { email: { equals: meta.email, mode: "insensitive" } },
          select: { id: true, externalAuthSubject: true },
        });
        if (byEmail && (!byEmail.externalAuthSubject || byEmail.externalAuthSubject === cognitoSub)) {
          await prisma.customer.update({
            where: { id: byEmail.id },
            data: { externalAuthSubject: cognitoSub },
          });
          customerId = byEmail.id;
        }
      }
    }

    await prisma.user.upsert({
      where: { cognitoSub },
      create: {
        cognitoSub,
        email: meta.email,
        role: meta.role,
        status: "Active",
        customerId,
      },
      update: {
        email: meta.email ?? undefined,
        role: meta.role,
        ...(customerId ? { customerId } : {}),
      },
    });
    upserted += 1;
  }

  console.info(`[backfill] upserted ${upserted} users`);
  await prisma.$disconnect();
}

function rankRole(role: ReturnType<typeof accountMgmtRoleToUserRole>): number {
  if (role === "SuperAdmin") return 2;
  if (role === "Admin") return 1;
  return 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
