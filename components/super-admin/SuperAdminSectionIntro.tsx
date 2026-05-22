import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export default function SuperAdminSectionIntro({ icon: Icon, title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-4 min-w-0">
        <span className="hidden sm:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cream-dark/50 bg-white/80 text-teal-dark/85">
          <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/40">Super admin</p>
          <h1 className="mt-1 font-display text-2xl text-teal-dark tracking-tight">{title}</h1>
          {subtitle ? (
            <div className="mt-2 max-w-2xl text-[13px] leading-relaxed text-charcoal/65">{subtitle}</div>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0 flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
