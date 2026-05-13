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
 */

export {};
