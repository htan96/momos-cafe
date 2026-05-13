import Link from "next/link";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isAdmin } from "@/lib/auth/cognito/roles";

export default async function PortalHomePage() {
  const session = await getCognitoServerSession();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 space-y-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-teal-dark font-semibold">Cognito gated</p>
      <h1 className="text-3xl font-semibold font-display text-charcoal">Portal</h1>
      <p className="text-charcoal/70">
        Optional demo route when <code className="text-xs">COGNITO_PROTECTED_PREFIXES</code> includes{" "}
        <code className="text-xs">/portal</code>. Default middleware prefixes are{" "}
        <code className="text-xs">/account</code>, <code className="text-xs">/admin</code>, and{" "}
        <code className="text-xs">/super-admin</code>. Magic-link sessions stay on <code className="text-xs">/login/email</code>{" "}
        and operations use <code className="text-xs">OPS_SESSION</code> at <code className="text-xs">/ops/login</code>.
      </p>

      <pre className="rounded-xl border border-charcoal/10 bg-white p-4 text-sm overflow-auto">
        {JSON.stringify(session, null, 2)}
      </pre>

      <p className="text-sm text-charcoal/60">
        Admin flag (server decoded groups):{" "}
        <span className="font-semibold">{isAdmin(session?.groups ?? []) ? "yes" : "no"}</span>
      </p>

      <div className="flex gap-4 text-sm">
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
