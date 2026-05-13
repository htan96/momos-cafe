/**
 * ## Cognito integration (skeleton)
 *
 * This package centralizes password auth against a Cognito User Pool while leaving room for Hosted UI or social IdPs.
 * An Identity Pool id is accepted via env for future temporary AWS credential flows but is not exercised yet.
 *
 * ### Migration note (legacy removal)
 * - Previous magic-link storefront sessions (`MOMOS_CUSTOMER`), ops password bootstrap (`OPS_SESSION`), and related routes
 *   have been removed. **All humans** (customers and ops staff) authenticate through Cognito user pool accounts with
 *   groups `customer`, `admin`, and/or `super_admin`. Provision ops users in Cognito with `admin` or `super_admin`; data
 *   migration from legacy sessions is not automated.
 *
 * ### Security notes
 * - **Middleware** decodes the ID token from an httpOnly cookie and checks `iss` + `exp` only. For proof against
 *   token forgery, call `GetUser` with the access token inside API Routes or verify signatures with the pool JWKS
 *   (`jose.jwtVerify` + `createRemoteJWKSet`).
 * - **Refresh tokens** stay httpOnly and are never exposed to browser JavaScript in this wiring.
 * - Prefer a **public app client + PKCE** for SPAs; add `COGNITO_CLIENT_SECRET` only when you must use a confidential
 *   client (SECRET_HASH is applied automatically in that case).
 *
 * ### MFA (TOTP)
 * - Pool policy must allow software token MFA. Enrollment + challenge completion are stubbed under `mfa.ts`.
 * - Flip `COGNITO_MFA_OPTIONAL=false` when you want builds to treat MFA challenges as blocking until implemented.
 * - **Until MFA UX ships**: Prefer Cognito → Sign-in experience → **MFA = Optional** (or Off) so `USER_PASSWORD_AUTH` returns tokens.
 * - Optional escape hatch: `COGNITO_TEMP_DISABLE_USER_MFA_BEFORE_LOGIN=true` runs `AdminSetUserMFAPPreference` + one retry
 *   (needs IAM `cognito-idp:AdminSetUserMFAPPreference`). Remove when `RespondToAuthChallenge` is implemented.
 * - **TODO**: Enforce `SOFTWARE_TOKEN_MFA` for `super_admin` only via `RespondToAuthChallenge` — see `cognitoClient.ts` / `mfa.ts`.
 *
 * ### Route protection
 * - `COGNITO_PROTECTED_PREFIXES` lists extra path prefixes gated in `middleware.ts` (default `/account,/admin,/super-admin`).
 * - **`/ops` and `/api/ops`** always require Cognito with `admin` or `super_admin`, regardless of that env list.
 * - When you change prefixes, **extend `middleware.ts` `config.matcher`** with matching patterns (matchers are static);
 *   non-`/api` matched paths skip the internal orchestration secret gate.
 * - Storefront Cognito sign-in UI is `/login`; `/auth/cognito/login` redirects there for bookmarks.
 *
 * ### AWS console map for env values
 * - **COGNITO_REGION**: Cognito → User pools → your pool → **Pool overview** (ARN includes region) or top-right region.
 * - **COGNITO_USER_POOL_ID**: Pool overview → **Pool id** (e.g. `us-west-2_xxxx`).
 * - **COGNITO_CLIENT_ID**: Pool → **App integration** → **App clients** → select client → **Client id**.
 * - **COGNITO_CLIENT_SECRET**: Same app client panel — only if *client secret* generated (confidential client).
 * - **COGNITO_IDENTITY_POOL_ID**: Federated identities → **Identity pools** → **Identity pool ID**.
 * - **COGNITO_HOSTED_UI_DOMAIN**: App integration → **Domain** (custom prefix or Cognito domain; value without `https://`).
 * - **COGNITO_OAUTH_REDIRECT_URI / LOGOUT**: App client → **Hosted UI** allowed callback / sign-out URLs.
 *
 * ### Groups
 * - Model roles with Cognito groups `super_admin`, `admin`, and `customer` only, and include them in the ID token.
 * - **Customers**: API routes **`POST /api/auth/cognito/signup`** and **`POST /api/auth/cognito/confirm-signup`** call
 *   **`AdminAddUserToGroup`** for group **`customer`** after a successful Cognito response (duplicate add is normally a
 *   no-op; failures log a warning — needs IAM **`cognito-idp:AdminAddUserToGroup`**).
 *
 * ### Internal admins / super_admin (preferred — avoid `NEW_PASSWORD_REQUIRED`)
 * - Do **not** rely on **`AdminCreateUser` + temporary password** alone for **`admin` / `super_admin`**; that puts the user in **`FORCE_CHANGE_PASSWORD`**, so the first **`USER_PASSWORD_AUTH`** returns **`NEW_PASSWORD_REQUIRED`** until they complete **`RespondToAuthChallenge`** or you fix it with the API below.
 * - **Preferred provisioning**: Create the pool user (optional **`admin-create-user`**), then immediately call **`admin-set-user-password`** with **`--permanent`** (`Permanent: true` in APIs). Cognito accepts normal sign-in without the forced new-password challenge.
 * - **`NEW_PASSWORD_REQUIRED` UI/API** (`POST /api/auth/cognito/new-password`, **`409`** on login with **`requiresPasswordChange`**) stays in the app **for legacy invited users** — keep using it where temp-password onboarding already exists.
 *
 * ### AWS CLI v2 cheat sheet — permanent password after create
 * Replace **`USER_POOL_ID`**, **`USERNAME`**, **`PASSWORD`**, and region/profile as needed. Ensure the IAM principal has **`cognito-idp:AdminCreateUser`**, **`cognito-idp:AdminSetUserPassword`**, **`cognito-idp:AdminDeleteUser`** (cleanup), **`cognito-idp:AdminAddUserToGroup`**, **`cognito-idp:AdminRemoveUserFromGroup`** (when re-provisioning groups).
 *
 * **1a. Optional create user (suppress default invite email)**  
 * ```bash
 * aws cognito-idp admin-create-user \
 *   --region "$AWS_REGION" \
 *   --user-pool-id "$USER_POOL_ID" \
 *   --username "$USERNAME" \
 *   --user-attributes Name=email,Value=user@example.com Name=email_verified,Value=true \
 *   --message-action SUPPRESS
 * ```
 *
 * **1b. Set password as permanent (`CONFIRMED` path — user does not see `NEW_PASSWORD_REQUIRED`)**  
 * ```bash
 * aws cognito-idp admin-set-user-password \
 *   --region "$AWS_REGION" \
 *   --user-pool-id "$USER_POOL_ID" \
 *   --username "$USERNAME" \
 *   --password "$PASSWORD" \
 *   --permanent
 * ```
 *
 * **2. Attach groups (`super_admin` and/or `admin`)** — run once per group (repeat with **`group-name admin`** if needed):  
 * ```bash
 * aws cognito-idp admin-add-user-to-group \
 *   --region "$AWS_REGION" \
 *   --user-pool-id "$USER_POOL_ID" \
 *   --username "$USERNAME" \
 *   --group-name super_admin
 * ```
 *
 * **3a. Dirty state / accidental temp password**: Still `FORCE_CHANGE_PASSWORD`? Repeat **1b** with a fresh strong **`$PASSWORD`**.
 *
 * **3b. Full reset**: Remove and recreate cleanly (drops group memberships — re-run **2**):  
 * ```bash
 * aws cognito-idp admin-delete-user \
 *   --region "$AWS_REGION" \
 *   --user-pool-id "$USER_POOL_ID" \
 *   --username "$USERNAME"
 * ```
 * …then **1a** (optional), **1b**, **2** again.
 *
 * ### Console caveat (`FORCE_CHANGE_PASSWORD`)
 * - In the Cognito console, a user appearing **Confirmed** and **Enabled** does **not** by itself clear **`FORCE_CHANGE_PASSWORD`**. Operators must finish the **`NEW_PASSWORD_REQUIRED`** challenge in-app (legacy path) **or** an admin must call **`admin-set-user-password` / `AdminSetUserPassword`** with a **permanent** password.
 *
 * ### First-login / invited staff (`NEW_PASSWORD_REQUIRED`, legacy onboarding)
 * - Users created with **AdminCreateUser** and a **temporary** password / invite flow land in **FORCE_CHANGE_PASSWORD**.
 * - First **`USER_PASSWORD_AUTH`** returns **`NEW_PASSWORD_REQUIRED`** until **`RespondToAuthChallenge`** posts **`NEW_PASSWORD`**.
 * - **Challenge `Session` tokens are single-use**: each **`InitiateAuth`** returns a fresh session for that attempt. **`RespondToAuthChallenge`** must use the session from the **latest** **`InitiateAuth`** with no second **`InitiateAuth`** or successful respond in between (double submit, signing in again in another tab/device, etc.). **`NEW_PASSWORD_REQUIRED`** is unaffected by **`COGNITO_TEMP_DISABLE_USER_MFA_BEFORE_LOGIN`** (that retry path runs only when the challenge name is MFA-related). Otherwise Cognito may return “invalid session / only used once” — **`sign_in`** again for a fresh session.
 * - App route: **`POST /api/auth/cognito/new-password`** — UI collects permanent password after **`409`** from **`POST /api/auth/cognito/login`** when **`requiresPasswordChange`** is true.
 *
 * ### Long-term onboarding (recommended)
 * - **Customers**: Self-signup via **`/signup`** → confirm email if pool requires → **`/login`** with chosen password (no temp-password challenge).
 * - **Admin / super_admin (internal)**: Use **`AdminSetUserPassword`** with **`Permanent: true`** (CLI above) right after **`AdminCreateUser`** so **`NEW_PASSWORD_REQUIRED`** never triggers; legacy temp-password onboarding remains available for invites.
 * - **Optional future**: Enforce **TOTP** for **`super_admin`** via **`RespondToAuthChallenge`** (`mfa.ts`).
 *
 * ### CDN / deploy (stale `/_next/*` after releases)
 * - Prefer invalidating or short-TTL cache rules for **`/_next/static`** and Flight/RSC paths so post-login hard navigation (`NEXT_PUBLIC_POST_LOGIN_HARD_NAV` in `CognitoLoginForm`) always pairs with a consistent asset set.
 */

export {};
