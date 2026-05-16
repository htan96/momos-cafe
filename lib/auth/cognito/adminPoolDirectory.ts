import {
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
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
  name: string | null;
  userCreateDate: Date | null;
};

function attr(attrs: ReadonlyArray<{ Name?: string; Value?: string }> | undefined, name: string): string | null {
  const hit = attrs?.find((a) => a.Name === name)?.Value?.trim();
  return hit && hit.length > 0 ? hit : null;
}

function mapUser(u: {
  Username?: string;
  Attributes?: ReadonlyArray<{ Name?: string; Value?: string }>;
  UserCreateDate?: Date;
}): ListedPoolUser | null {
  const username = u.Username?.trim();
  if (!username) return null;
  const attrs = u.Attributes ?? [];
  const sub = attr(attrs, "sub");
  if (!sub) return null;
  const composed = [attr(attrs, "given_name"), attr(attrs, "family_name")]
    .filter(Boolean)
    .join(" ")
    .trim();
  const nameResolved = attr(attrs, "name") ?? (composed.length > 0 ? composed : null);
  return {
    username,
    sub,
    email: attr(attrs, "email"),
    name: nameResolved,
    userCreateDate: u.UserCreateDate instanceof Date ? u.UserCreateDate : null,
  };
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
    const sub = attr(attrs, "sub");
    if (!uname || !sub) return null;

    const composedFromParts = [attr(attrs, "given_name"), attr(attrs, "family_name")]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      username: uname,
      sub,
      email: attr(attrs, "email"),
      name: attr(attrs, "name") ?? (composedFromParts.length > 0 ? composedFromParts : null),
      userCreateDate: res.UserCreateDate instanceof Date ? res.UserCreateDate : null,
    };
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
