import type { ListedPoolUser } from "@/lib/auth/cognito/adminPoolDirectory";
import { adminListUsersInPoolGroup } from "@/lib/auth/cognito/adminPoolDirectory";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";

export type ElevatedStaffRosterRow = ListedPoolUser & {
  /** Highest assigned staff pool group — `super_admin` also carries `admin` in Cognito. */
  accessLevel: "super_admin" | "admin";
};

/** Merge `admin` + `super_admin` pool memberships for a singular roster surface. */
export async function loadElevatedStaffRoster(cfg: CognitoEnvConfig): Promise<ElevatedStaffRosterRow[]> {
  const [adminsRaw, supersRaw] = await Promise.all([
    adminListUsersInPoolGroup(cfg, "admin"),
    adminListUsersInPoolGroup(cfg, "super_admin"),
  ]);

  const superSubs = new Set(supersRaw.map((u) => u.sub));
  const merged = new Map<string, ElevatedStaffRosterRow>();

  for (const u of adminsRaw) {
    merged.set(u.sub, {
      ...u,
      accessLevel: superSubs.has(u.sub) ? "super_admin" : "admin",
    });
  }

  for (const u of supersRaw) {
    const prev = merged.get(u.sub);
    merged.set(u.sub, {
      ...(prev ?? u),
      ...u,
      accessLevel: "super_admin",
    });
  }

  return [...merged.values()].sort((a, b) => {
    const ra = a.accessLevel === "super_admin" ? 0 : 1;
    const rb = b.accessLevel === "super_admin" ? 0 : 1;
    if (ra !== rb) return ra - rb;
    const ae = (a.email ?? "").toLowerCase();
    const be = (b.email ?? "").toLowerCase();
    return ae.localeCompare(be);
  });
}
