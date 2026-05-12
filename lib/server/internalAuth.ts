import { INTERNAL_SECRET_HEADER } from "@/lib/server/orchestrationConstants";

/** Route-handler helper when middleware is bypassed (tests / scripts). */
export function verifyInternalSecretFromRequest(req: Request): boolean {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret || secret.length < 24) return false;
  const bearer = req.headers.get("authorization");
  const raw = req.headers.get(INTERNAL_SECRET_HEADER);
  const token =
    bearer?.startsWith("Bearer ") ? bearer.slice("Bearer ".length).trim() : raw?.trim() ?? "";
  return token === secret;
}
