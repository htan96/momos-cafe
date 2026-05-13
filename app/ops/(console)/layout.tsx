import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import OpsShell from "@/components/ops/OpsShell";

export default async function OpsConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getOpsSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/ops")}`);

  return (
    <OpsShell email={session.email} role={session.role} roleBadge={session.roleBadge}>
      {children}
    </OpsShell>
  );
}
