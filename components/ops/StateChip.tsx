type ChipTone = "neutral" | "warn" | "danger" | "ok" | "teal";

const toneClass: Record<ChipTone, string> = {
  neutral: "bg-[#3d3830]/80 text-[#f5e5c0]",
  warn: "bg-[#d4af37]/20 text-[#f5e5c0] border border-[#d4af37]/40",
  danger: "bg-red-950/40 text-red-200 border border-red-900/50",
  ok: "bg-teal-950/40 text-teal-100 border border-teal-800/50",
  teal: "bg-[#2f6d66]/30 text-[#8FC4C4] border border-[#2f6d66]/40",
};

export default function StateChip({
  label,
  tone = "neutral",
  className = "",
}: {
  label: string;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${toneClass[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
