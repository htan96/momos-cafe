import type { AccountMgmtRole } from "@/lib/accountManagement/accountsBrowse";
import { deriveAccountRoleFromGroups } from "@/lib/accountManagement/deriveAccountRole";
import type { AuthUser } from "@/lib/auth/AuthProvider";
import { isProtectedAdminLoginEmail } from "@/lib/auth/protectedAdminEmail";
import { prisma } from "@/lib/prisma";
import type { UserRole, UserStatus } from "@prisma/client";

export type AuthzSource = "db" | "dual" | "cognito";

export function getAuthzSource(): AuthzSource {
  const v = process.env.AUTHZ_SOURCE?.trim().toLowerCase();
  if (v === "cognito" || v === "dual") return v;
  return "db";
}

export type UserAuthority = {
  cognitoSub: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  customerId: string | null;
};

export function isActiveUserStatus(status: UserStatus): boolean {
  return status === "Active";
}

export function accountMgmtRoleToUserRole(role: AccountMgmtRole): UserRole {
  switch (role) {
    case "super_admin":
      return "SuperAdmin";
    case "admin":
      return "Admin";
    default:
      return "Customer";
  }
}

export function userRoleToAccountMgmtRole(role: UserRole): AccountMgmtRole {
  switch (role) {
    case "SuperAdmin":
      return "super_admin";
    case "Admin":
      return "admin";
    default:
      return "customer";
  }
}

export function userRoleToCognitoGroup(role: UserRole): string {
  switch (role) {
    case "SuperAdmin":
      return "super_admin";
    case "Admin":
      return "admin";
    default:
      return "customer";
  }
}

export function cognitoGroupsForUserRole(role: UserRole): readonly string[] {
  return [userRoleToCognitoGroup(role)];
}

export function deriveUserRoleFromCognitoGroups(groups: readonly string[]): UserRole {
  return accountMgmtRoleToUserRole(deriveAccountRoleFromGroups(groups));
}

/** Resolve authoritative role/status for a Cognito subject. */
export async function resolveUserAuthority(
  cognitoSub: string,
  cognitoGroups?: readonly string[]
): Promise<UserAuthority | null> {
  const sub = cognitoSub.trim();
  if (!sub) return null;

  const source = getAuthzSource();
  const row = await prisma.user.findUnique({
    where: { cognitoSub: sub },
    select: { cognitoSub: true, email: true, role: true, status: true, customerId: true },
  });

  if (source === "cognito") {
    const role = deriveUserRoleFromCognitoGroups(cognitoGroups ?? []);
    return {
      cognitoSub: sub,
      email: row?.email ?? null,
      role,
      status: row?.status ?? "Active",
      customerId: row?.customerId ?? null,
    };
  }

  if (row) {
    if (source === "dual" && cognitoGroups?.length) {
      const fromGroups = deriveUserRoleFromCognitoGroups(cognitoGroups);
      if (fromGroups !== row.role) {
        console.warn("[authz] dual_mode_role_mismatch", {
          cognitoSub: sub,
          dbRole: row.role,
          cognitoRole: fromGroups,
        });
      }
    }
    return {
      cognitoSub: row.cognitoSub,
      email: row.email,
      role: row.role,
      status: row.status,
      customerId: row.customerId,
    };
  }

  if (source === "db") {
    return null;
  }

  const role = deriveUserRoleFromCognitoGroups(cognitoGroups ?? []);
  return {
    cognitoSub: sub,
    email: null,
    role,
    status: "Active",
    customerId: null,
  };
}

export function enrichAuthUser(base: AuthUser, authority: UserAuthority | null): AuthUser {
  if (!authority) return base;
  return {
    ...base,
    role: authority.role,
    status: authority.status,
    customerId: authority.customerId,
  };
}

export async function enrichAuthUserFromDb(base: AuthUser): Promise<AuthUser> {
  const authority = await resolveUserAuthority(base.sub, base.groups);
  return enrichAuthUser(base, authority);
}

/** After confirm-signup: Customer + Active; links commerce row when email present. */
export async function upsertUserOnSignup(params: {
  cognitoSub: string;
  email?: string | null;
}): Promise<UserAuthority> {
  const cognitoSub = params.cognitoSub.trim();
  const email = params.email?.trim().toLowerCase() || null;

  let customerId: string | null = null;
  if (email) {
    const existing = await prisma.customer.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, externalAuthSubject: true },
    });
    if (existing) {
      const bound = existing.externalAuthSubject?.trim();
      if (!bound || bound === cognitoSub) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: { externalAuthSubject: cognitoSub, email },
        });
        customerId = existing.id;
      }
    } else {
      const created = await prisma.customer.create({
        data: { email, externalAuthSubject: cognitoSub },
        select: { id: true },
      });
      customerId = created.id;
    }
  }

  const row = await prisma.user.upsert({
    where: { cognitoSub },
    create: {
      cognitoSub,
      email,
      role: "Customer",
      status: "Active",
      customerId,
    },
    update: {
      ...(email ? { email } : {}),
      ...(customerId ? { customerId } : {}),
    },
    select: { cognitoSub: true, email: true, role: true, status: true, customerId: true },
  });

  return {
    cognitoSub: row.cognitoSub,
    email: row.email,
    role: row.role,
    status: row.status,
    customerId: row.customerId,
  };
}

export async function countActiveSuperAdmins(): Promise<number> {
  return prisma.user.count({
    where: { role: "SuperAdmin", status: "Active" },
  });
}

export async function applyDbStaffRoleChange(params: {
  targetCognitoSub: string;
  nextRole: AccountMgmtRole;
  actorSub: string;
}): Promise<
  | { ok: true; fromRole: AccountMgmtRole; toRole: AccountMgmtRole }
  | { ok: false; code: string; status: number; message?: string }
> {
  let target = await prisma.user.findUnique({
    where: { cognitoSub: params.targetCognitoSub.trim() },
    select: { cognitoSub: true, role: true, status: true, email: true },
  });
  if (!target) {
    await prisma.user.create({
      data: {
        cognitoSub: params.targetCognitoSub.trim(),
        role: "Customer",
        status: "Active",
      },
    });
    target = await prisma.user.findUnique({
      where: { cognitoSub: params.targetCognitoSub.trim() },
      select: { cognitoSub: true, role: true, status: true, email: true },
    });
    if (!target) {
      return { ok: false, code: "target_not_found", status: 404 };
    }
  }

  const fromRole = userRoleToAccountMgmtRole(target.role);
  const toRole = params.nextRole;
  if (fromRole === toRole) {
    return {
      ok: false,
      code: "no_role_change",
      status: 409,
      message: "User already has this role.",
    };
  }

  if (fromRole === "super_admin" && toRole !== "super_admin") {
    const n = await countActiveSuperAdmins();
    if (n <= 1 && target.status === "Active") {
      return {
        ok: false,
        code: "last_super_admin",
        status: 400,
        message: "Cannot remove the final super-admin. Promote another operator first.",
      };
    }
  }

  if (params.actorSub === target.cognitoSub && fromRole === "super_admin" && toRole !== "super_admin") {
    return {
      ok: false,
      code: "confirmation_required",
      status: 400,
      message: "Self-demotion from super-admin requires explicit confirmation in the API body.",
    };
  }

  if (target.email && isProtectedAdminLoginEmail(target.email) && toRole !== "super_admin") {
    return {
      ok: false,
      code: "protected_bootstrap_admin",
      status: 403,
      message: "Bootstrap super-admin account cannot be demoted via database role change.",
    };
  }

  await prisma.user.update({
    where: { cognitoSub: target.cognitoSub },
    data: { role: accountMgmtRoleToUserRole(toRole) },
  });

  return { ok: true, fromRole, toRole };
}

export async function setUserStatusByCognitoSub(
  cognitoSub: string,
  status: UserStatus
): Promise<boolean> {
  const sub = cognitoSub.trim();
  if (!sub) return false;
  const row = await prisma.user.findUnique({
    where: { cognitoSub: sub },
    select: { email: true },
  });
  if (row?.email && isProtectedAdminLoginEmail(row.email) && status !== "Active") {
    return false;
  }
  const res = await prisma.user.updateMany({
    where: { cognitoSub: sub },
    data: { status },
  });
  return res.count > 0;
}

export async function findUserByEmailNorm(email: string) {
  const norm = email.trim().toLowerCase();
  if (!norm) return null;
  return prisma.user.findFirst({
    where: { email: { equals: norm, mode: "insensitive" } },
    select: {
      id: true,
      cognitoSub: true,
      email: true,
      role: true,
      status: true,
      customerId: true,
    },
  });
}
