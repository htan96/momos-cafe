import { redirect } from "next/navigation";
import { safeAuthRedirectPath } from "@/lib/auth/emailNormalize";

/** Legacy URL — unified entry is `/login`. */
export default async function OpsLoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeAuthRedirectPath(sp.next ?? null, "/ops");
  const opsNext = next.startsWith("/ops") && !next.startsWith("//") ? next : "/ops";
  redirect(`/login?next=${encodeURIComponent(opsNext)}`);
}
