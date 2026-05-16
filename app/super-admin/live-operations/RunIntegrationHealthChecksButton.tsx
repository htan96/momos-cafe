"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function RunIntegrationHealthChecksButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await fetch("/api/super-admin/integration-health/run", {
            method: "POST",
            credentials: "same-origin",
          });
          if (res.ok) router.refresh();
        });
      }}
      className="normal-case tracking-normal rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-teal-dark shadow-sm transition hover:bg-cream-mid/40 disabled:opacity-60"
    >
      {pending ? "Running…" : "Run checks now"}
    </button>
  );
}
