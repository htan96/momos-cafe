type Tone = "ok" | "warn" | "neutral" | "teal" | "danger";

/**
 * Readable status capsule — **`theme`** switches between storefront admin creamsicle and deprecated dark ops chrome.
 */
export default function StateToneChip({
  label,
  tone,
  theme = "admin",
}: {
  label: string;
  tone: Tone;
  theme?: "admin" | "dark";
}) {
  const darkTone: Record<Tone, string> = {
    ok: "border-[#2f6d66]/55 text-[#8FC4C4] bg-[#1f2c2c]/95",
    warn: "border-[#92733a]/60 text-[#f5cfa3] bg-[#2b241d]/92",
    neutral: "border-[#554c44]/85 text-[#c9bba8]/88 bg-[#1c1916]/85",
    teal: "border-[#356e70]/52 text-[#9dd4d8] bg-[#1f2e30]/93",
    danger: "border-[#96454b]/72 text-[#f1b9bc] bg-[#2f1d20]/93",
  };
  const adminTone: Record<Tone, string> = {
    ok: "border-emerald-900/25 text-emerald-900/92 bg-emerald-50",
    warn: "border-amber-800/35 text-amber-950 bg-amber-50",
    neutral: "border-charcoal/15 text-charcoal/82 bg-white",
    teal: "border-teal-dark/35 text-teal-dark bg-teal/[0.08]",
    danger: "border-red-800/38 text-red-950 bg-red-50",
  };
  const map = theme === "dark" ? darkTone : adminTone;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-[0.08em] font-semibold ${map[tone]}`}
    >
      {label}
    </span>
  );
}
