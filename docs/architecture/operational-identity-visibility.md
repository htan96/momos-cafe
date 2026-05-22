# Operational identity visibility

## Boundary

Super-admin **`/super-admin/operations/operational-identity`** is an **internal** console. It intentionally stops short of an IAM dashboard:

| In scope | Out of scope |
| --- | --- |
| Read prisma `customers` linkage + coarse operational counts | Password reset / MFA / arbitrary attribute churn |
| Read Cognito `AdminGetUser` + `AdminListGroupsForUser` (when wired) | Broad Cognito consoles or SSO directory sync tooling |
| **Narrow** group **`customer` \| `admin` \| `super_admin`** add/remove (`AdminAdd*` / `AdminRemove*` ) | Editing custom pool groups beyond the known storefront roles |

Customers never see these routes — only **`super_admin`** sessions pass **`requireSuperStaffJson()`** (+ explicit **`isSuperAdmin`** guards on POST).

## Cognito mutation path

Granular edits land on **`POST /api/super-admin/operations/operational-identity/[id]`** with JSON:

- **`dangerConfirm: true`** *or* **`confirmToken: "OPERATIONS_IDENTITY_GROUP_CHANGE_V1"`**
- **`targetCognitoSub`**, **`groupName`**, **`action`** (`add` \| `remove`)
- **`selfDemotionAckEmail`** when removing your own **`super_admin`** tier (parity with **`/api/admin/accounts/staff-role`**)

Higher-level ladder moves remain on **`PATCH /api/admin/accounts/staff-role`** (**`USER_ROLE_CHANGED` / `ADMIN_PROMOTED` / `ADMIN_DEMOTED`**).

### When env / IAM is absent

Routes return **`503 { code: COGNITO_UNCONFIGURED }`**. Mutation attempts append **`GovernanceAuditEvent`** **`OPERATIONS_IDENTITY_ROLE_MEMBERSHIP_CHANGE`** with **`metadata.phase = cognito_unconfigured`** so escalation review still sees intent.

### Runtime failure

If Cognito rejects the mutation, we still persist an audit row with **`metadata.phase = cognitoMutationError`** (before-groups only — after snapshot mirrors “no change”). Successful applies use **`phase: applied`** with authoritative **`beforeGroups`/`afterGroups`**.

## Audit constant

Append-only **`GovernanceAuditEvent.actionType`**: **`OPERATIONS_IDENTITY_ROLE_MEMBERSHIP_CHANGE`**.

Recommended metadata shape (canonical fields):

```json
{
  "beforeGroups": ["customer"],
  "afterGroups": ["customer", "admin"],
  "target": { "sub": "<cognito uuid>", "username": "<pool username>", "email": "<email>" },
  "actor": { "sub": "<actor sub>", "email": "<staff email>" },
  "groupName": "admin",
  "action": "add",
  "phase": "applied"
}
```

## Escalation

1. Prefer reading **`GovernanceAuditEvent`** timelines + prisma customer dossiers before changing groups manually in AWS console.
2. If Cognito denies writes, verify **`cognito-idp:AdminAddUserToGroup`**, **`AdminRemoveUserFromGroup`**, **`AdminListGroupsForUser`**, and **`AdminGetUser`** IAM coverage for the workload role.
3. After incidents, correlate **`OperationalActivityEvent`** feed copies on the detail surface with impersonation audits — they intentionally dedupe impersonation fingerprints when possible.
