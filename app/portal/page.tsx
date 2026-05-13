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
        This route illustrates middleware protection (`COGNITO_PROTECTED_PREFIXES`, default `/portal`). Magic-link and ops
        flows stay on their existing paths.
      </p>

      <pre className="rounded-xl border border-charcoal/10 bg-white p-4 text-sm overflow-auto">
        {JSON.stringify(session, null, 2)}
      </pre>

      <p className="text-sm text-charcoal/60">
        Admin flag (server decoded groups):{" "}
        <span className="font-semibold">{isAdmin(session?.groups ?? []) ? "yes" : "no"}</span>
      </p>

      <div className="flex gap-4 text-sm">
        <Link href="/auth/cognito/login" className="text-teal-dark underline">
          Cognito login
        </Link>
        <Link href="/" className="text-teal-dark underline">
          Site home
        </Link>
      </div>
    </div>
  );
}
