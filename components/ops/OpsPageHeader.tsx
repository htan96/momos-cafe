import type { ReactNode } from "react";

export default function OpsPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 border-b border-[#3d3830] pb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#f5e5c0]">{title}</h1>
        {description ? (
          <p className="text-[13px] text-[#c9bba8]/85 mt-1 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
