import type { MaintenanceConflict } from "@/lib/governance/maintenanceConflict";

type Props = {
  conflicts: MaintenanceConflict[];
  className?: string;
};

export default function MaintenanceConflictBanner({ conflicts, className = "" }: Props) {
  if (conflicts.length === 0) return null;

  return (
    <div
      role="status"
      className={`rounded-xl border border-amber-800/35 bg-amber-900/[0.06] px-4 py-3 text-[13px] text-charcoal/80 ${className}`}
    >
      <p className="font-semibold text-charcoal">Maintenance configuration drift detected</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
        {conflicts.map((c) => (
          <li key={c.id}>
            <span className="font-medium">{c.message}</span>
            <span className="text-charcoal/60"> — {c.detail}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] text-charcoal/55">
        Align governance kill switches with admin maintenance gates, or update AppSetting from Feature controls.
      </p>
    </div>
  );
}
