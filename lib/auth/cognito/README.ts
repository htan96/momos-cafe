/**
 * ## Cognito integration (skeleton)
 *
 * This package centralizes password auth against a Cognito User Pool while leaving room for Hosted UI or social IdPs.
 * An Identity Pool id is accepted via env for future temporary AWS credential flows but is not exercised yet.
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
 *
 * ### Route protection
 * - `COGNITO_PROTECTED_PREFIXES` lists path prefixes gated in `middleware.ts` (default `/portal`).
 * - When you change prefixes, **extend `middleware.ts` `config.matcher`** with matching patterns (matchers are static);
 *   non-`/api` matched paths skip the internal orchestration secret gate.
 * - Magic-link `/login` + `OPS_SESSION` flows remain untouched; Cognito UI lives under `/auth/cognito/*`.
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
 * - Model roles with Cognito groups `super_admin`, `admin`, `employee`, `customer` and include them in the ID token.
 */

export {};
