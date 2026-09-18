import {
  bootstrapCognitoSubForEmail,
  normalizedBootstrapAdminEmail,
} from "@/lib/bootstrap/config";
import { findUserByEmailNorm } from "@/lib/auth/userAuthority";
import { prisma } from "@/lib/prisma";
import type { UserRole, UserStatus } from "@prisma/client";

export type BootstrapSuperAdminRecord = {
  cognitoSub: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created: boolean;
};

/**
 * Upsert/repair Postgres `users` row for bootstrap email — SuperAdmin + Active.
 * Prefers existing row matched by email (real Cognito sub) over synthetic `bootstrap:` sub.
 */
export async function ensureBootstrapSuperAdminUser(): Promise<BootstrapSuperAdminRecord> {
  const email = normalizedBootstrapAdminEmail();
  if (!email) throw new Error("bootstrap_email_unconfigured");

  const existingByEmail = await findUserByEmailNorm(email);
  if (existingByEmail) {
    const updated = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { role: "SuperAdmin", status: "Active", email },
      select: { cognitoSub: true, email: true, role: true, status: true },
    });
    return {
      cognitoSub: updated.cognitoSub,
      email,
      role: updated.role,
      status: updated.status,
      created: false,
    };
  }

  const cognitoSub = bootstrapCognitoSubForEmail(email);
  const row = await prisma.user.upsert({
    where: { cognitoSub },
    create: {
      cognitoSub,
      email,
      role: "SuperAdmin",
      status: "Active",
    },
    update: {
      email,
      role: "SuperAdmin",
      status: "Active",
    },
    select: { cognitoSub: true, role: true, status: true },
  });

  return {
    cognitoSub: row.cognitoSub,
    email,
    role: row.role,
    status: row.status,
    created: true,
  };
}
