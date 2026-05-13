import Link from "next/link";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";

export default async function SuperAdminHomePage() {
  const session = await getCognitoServerSession();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 space-y-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-teal-dark font-semibold">Super admin</p>
      <h1 className="text-3xl font-semibold font-display text-charcoal">Super admin area</h1>
      <p className="text-charcoal/70">
        Cognito groups from your session (requires <span className="font-medium">super_admin</span> only in this zone).
      </p>
      <pre className="rounded-xl border border-charcoal/10 bg-white p-4 text-sm overflow-auto">
        {JSON.stringify(session, null, 2)}
      </pre>
      <p className="text-sm text-charcoal/60">
        Super admin:{" "}
        <span className="font-semibold">{isSuperAdmin(session?.groups ?? []) ? "yes" : "no"}</span>
      </p>
      <div className="flex gap-4 text-sm">
        <Link href="/admin" className="text-teal-dark underline">
          Admin home
        </Link>
        <Link href="/login" className="text-teal-dark underline">
          Sign in
        </Link>
        <Link href="/" className="text-teal-dark underline">
          Site home
        </Link>
      </div>
    </div>
  );
}
