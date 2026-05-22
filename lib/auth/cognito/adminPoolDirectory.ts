import {
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import { CUSTOMER_POOL_GROUP_NAME, adminAddUserToGroup } from "@/lib/auth/cognito/cognitoClient";
import type { CognitoGroup } from "@/lib/auth/cognito/types";

const clients = new Map<string, CognitoIdentityProviderClient>();

function client(cfg: CognitoEnvConfig): CognitoIdentityProviderClient {
  let c = clients.get(cfg.region);
  if (!c) {
    c = new CognitoIdentityProviderClient({ region: cfg.region });
    clients.set(cfg.region, c);
  }
  return c;
}

export type ListedPoolUser = {
  username: string;
  sub: string;
  email: string | null;
  preferredUsername: string | null;
  givenName: string | null;
  familyName: string | null;
  name: string | null;
  userCreateDate: Date | null;
  /** Cognito pool user Enabled flag — null when the API response omitted it. */
  enabled: boolean | null;
};

function attr(attrs: ReadonlyArray<{ Name?: string; Value?: string }> | undefined, name: string): string | null {
  const hit = attrs?.find((a) => a.Name === name)?.Value?.trim();
  return hit && hit.length > 0 ? hit : null;
}

/** Safe literal for Cognito **`ListUsers` → `Filter`** strings (escapes `\` and `"`). */
export function cognitoQuotedFilterLiteral(raw: string): string {
  const v = raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${v}"`;
}

function listedPoolUserFromAttributes(opts: {
  username: string;
  attrs: ReadonlyArray<{ Name?: string; Value?: string }>;
  userCreateDate?: Date | null;
  enabled?: boolean | null;
}): ListedPoolUser | null {
  const username = opts.username.trim();
  if (!username) return null;

  const attrs = opts.attrs ?? [];
  const sub = attr(attrs, "sub");
  if (!sub) return null;

  const givenName = attr(attrs, "given_name");
  const familyName = attr(attrs, "family_name");
  const composedParts = [givenName, familyName].filter(Boolean).join(" ").trim();

  const nameResolved =
    attr(attrs, "name") ??
    (composedParts.length > 0 ? composedParts : null);

  return {
    username,
    sub,
    email: attr(attrs, "email"),
    preferredUsername: attr(attrs, "preferred_username"),
    givenName,
    familyName,
    name: nameResolved,
    userCreateDate: opts.userCreateDate instanceof Date ? opts.userCreateDate : null,
    enabled: opts.enabled ?? null,
  };
}

/** One **`ListUsers`** page — **`cognito-idp:ListUsers`** (pagination via `PaginationToken`). */
export async function adminListUsersPage(
  cfg: CognitoEnvConfig,
  params: {
    limit?: number | undefined;
    paginationToken?: string | undefined;
    /** Cognito `Filter` grammar (`=` equality · `^=` prefix on supported attributes). */
    filter?: string | undefined;
  }
): Promise<{ users: ListedPoolUser[]; nextPaginationToken?: string | undefined }> {
  const res = await client(cfg).send(
    new ListUsersCommand({
      UserPoolId: cfg.userPoolId,
      Limit: params.limit ?? 60,
      PaginationToken: params.paginationToken,
      Filter: params.filter,
    })
  );

  const users: ListedPoolUser[] = [];
  for (const u of res.Users ?? []) {
    const username = u.Username?.trim();
    if (!username) continue;
    const mapped = listedPoolUserFromAttributes({
      username,
      attrs: u.Attributes ?? [],
      userCreateDate: u.UserCreateDate,
      enabled: typeof u.Enabled === "boolean" ? u.Enabled : null,
    });
    if (mapped) users.push(mapped);
  }

  return { users, nextPaginationToken: res.PaginationToken };
}

function mapUser(u: {
  Username?: string;
  Attributes?: ReadonlyArray<{ Name?: string; Value?: string }>;
  UserCreateDate?: Date;
  Enabled?: boolean;
}): ListedPoolUser | null {
  const username = u.Username?.trim();
  if (!username) return null;
  return listedPoolUserFromAttributes({
    username,
    attrs: u.Attributes ?? [],
    userCreateDate: u.UserCreateDate,
    enabled: typeof u.Enabled === "boolean" ? u.Enabled : null,
  });
}

export async function adminGetPoolUser(cfg: CognitoEnvConfig, usernameRaw: string): Promise<ListedPoolUser | null> {
  const username = usernameRaw.trim();
  if (!username) return null;

  try {
    const res = await client(cfg).send(
      new AdminGetUserCommand({
        UserPoolId: cfg.userPoolId,
        Username: username,
      })
    );

    const attrs = res.UserAttributes ?? [];
    const uname = res.Username?.trim();
    if (!uname) return null;

    return listedPoolUserFromAttributes({
      username: uname,
      attrs,
      userCreateDate: res.UserCreateDate,
      enabled: typeof res.Enabled === "boolean" ? res.Enabled : null,
    });
  } catch {
    return null;
  }
}

/** Paginates Cognito pool group membership; typically small for `admin` / `super_admin`. */
export async function adminListUsersInPoolGroup(
  cfg: CognitoEnvConfig,
  groupName: string
): Promise<ListedPoolUser[]> {
  const out: ListedPoolUser[] = [];
  let nextToken: string | undefined;

  const gn = groupName.trim();
  for (;;) {
    const res = await client(cfg).send(
      new ListUsersInGroupCommand({
        UserPoolId: cfg.userPoolId,
        GroupName: gn,
        NextToken: nextToken,
        Limit: 60,
      })
    );
    for (const u of res.Users ?? []) {
      const m = mapUser(u);
      if (m) out.push(m);
    }
    if (!res.NextToken) break;
    nextToken = res.NextToken;
  }
  return out;
}

/** Groups explicitly assigned (`AdminAddUserToGroup`) for this username. */
export async function adminListAssignedGroupsForUser(
  cfg: CognitoEnvConfig,
  cognitoUsername: string
): Promise<string[]> {
  const username = cognitoUsername.trim();
  let nextToken: string | undefined;
  const names: string[] = [];
  for (;;) {
    const res = await client(cfg).send(
      new AdminListGroupsForUserCommand({
        UserPoolId: cfg.userPoolId,
        Username: username,
        Limit: 60,
        NextToken: nextToken,
      })
    );
    for (const g of res.Groups ?? []) {
      if (g.GroupName) names.push(g.GroupName);
    }
    if (!res.NextToken) break;
    nextToken = res.NextToken;
  }
  return names;
}

export async function adminRemoveUserFromPoolGroup(
  cfg: CognitoEnvConfig,
  params: { username: string; groupName: CognitoGroup }
): Promise<void> {
  await client(cfg).send(
    new AdminRemoveUserFromGroupCommand({
      UserPoolId: cfg.userPoolId,
      Username: params.username.trim(),
      GroupName: params.groupName,
    })
  );
}

/** Count users in Cognito pool group (minimal attribute fetch — id only pagination). */
export async function adminCountUsersInPoolGroup(cfg: CognitoEnvConfig, groupName: string): Promise<number> {
  let nextToken: string | undefined;
  let n = 0;
  const gn = groupName.trim();
  for (;;) {
    const res = await client(cfg).send(
      new ListUsersInGroupCommand({
        UserPoolId: cfg.userPoolId,
        GroupName: gn,
        NextToken: nextToken,
        Limit: 60,
      })
    );
    n += (res.Users ?? []).length;
    if (!res.NextToken) break;
    nextToken = res.NextToken;
  }
  return n;
}

export async function cognitoEnsureCustomerGroup(cfg: CognitoEnvConfig, username: string): Promise<void> {
  await adminAddUserToGroup(cfg, { username: username.trim(), groupName: CUSTOMER_POOL_GROUP_NAME });
}

export async function cognitoEnsureStaffMembership(
  cfg: CognitoEnvConfig,
  params: {
    username: string;
    nextRole: "customer" | "admin" | "super_admin";
    /** Assigned groups prior to mutations (avoids stale extra round-trip mid-flight when caller passes). */
    previousGroups?: readonly string[];
  }
): Promise<void> {
  const username = params.username.trim();
  const assigned = params.previousGroups ?? (await adminListAssignedGroupsForUser(cfg, username));
  const assignedSet = new Set(assigned);

  const stripStaff = async () => {
    if (assignedSet.has("super_admin")) await adminRemoveUserFromPoolGroup(cfg, { username, groupName: "super_admin" });
    if (assignedSet.has("admin")) await adminRemoveUserFromPoolGroup(cfg, { username, groupName: "admin" });
  };

  switch (params.nextRole) {
    case "customer": {
      await stripStaff();
      await cognitoEnsureCustomerGroup(cfg, username);
      return;
    }
    case "admin": {
      if (assignedSet.has("super_admin"))
        await adminRemoveUserFromPoolGroup(cfg, { username, groupName: "super_admin" });
      if (!assignedSet.has("admin")) await adminAddUserToGroup(cfg, { username, groupName: "admin" });
      return;
    }
    case "super_admin": {
      if (!assignedSet.has("admin")) await adminAddUserToGroup(cfg, { username, groupName: "admin" });
      if (!assignedSet.has("super_admin"))
        await adminAddUserToGroup(cfg, { username, groupName: "super_admin" });
      return;
    }
    default:
      throw new Error("unknown_next_role");
  }
}
