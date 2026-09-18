import { clearBootstrapAuthCookies, bootstrapJson } from "@/lib/bootstrap/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = bootstrapJson({ ok: true });
  return clearBootstrapAuthCookies(res);
}
