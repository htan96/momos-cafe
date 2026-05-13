import { Suspense } from "react";
import OpsLoginClient from "./OpsLoginClient";

export default function OpsLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[420px] rounded-2xl border border-[#3d3830] bg-[#1c1916] px-8 py-16 text-center text-[#c9bba8]/70">
          Loading…
        </div>
      }
    >
      <OpsLoginClient />
    </Suspense>
  );
}
