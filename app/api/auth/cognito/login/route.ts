import { NextResponse } from "next/server";
import { createCognitoAuthProvider } from "@/lib/auth/cognito/cognitoAuthAdapter";
import { validateAccessToken } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { applyCognitoTokenCookies } from "@/lib/auth/cognito/httpCookies";
import { clearCognitoCookieJar } from "@/lib/auth/cognito/sessionCookies";

export const runtime = "nodejs";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const cfg = getCognitoConfig();
  if (!cfg) {
    return NextResponse.json({ error: "cognito_unconfigured" }, { status: 503 });
  }

  const body = await readBody(request);
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const provider = createCognitoAuthProvider(cfg);
  try {
    const result = await provider.signInWithPassword({ username, password });
    if (!result.ok) {
      if (result.challenge) {
        return NextResponse.json(
          {
            error: "auth_challenge",
            challengeName: result.challenge.name,
            session: result.challenge.session ?? null,
            mfaOptional: cfg.mfaOptional,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const bundle = result.sessionTokens;
    if (!bundle) {
      return NextResponse.json({ error: "missing_tokens" }, { status: 502 });
    }

    const valid = await validateAccessToken(cfg, bundle.accessToken);
    if (!valid) {
      const res = NextResponse.json({ error: "token_validation_failed" }, { status: 502 });
      clearCognitoCookieJar(res);
      return res;
    }

    const res = NextResponse.json({ ok: true, user: result.user });
    applyCognitoTokenCookies(res, bundle);
    return res;
  } catch {
    const res = NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    clearCognitoCookieJar(res);
    return res;
  }
}
