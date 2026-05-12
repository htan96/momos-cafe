import { Suspense } from "react";

export default function OpsLoginChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-0px)] flex items-center justify-center px-4 py-16">
      <Suspense
        fallback={<p className="text-[#c9bba8]/80 text-sm">Loading sign-in…</p>}
      >
        {children}
      </Suspense>
    </div>
  );
}
