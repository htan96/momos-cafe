export default function CommunicationRow({
  subject,
  preview,
  when,
  channel,
}: {
  subject: string;
  preview: string;
  when: string;
  channel: string;
}) {
  return (
    <div className="rounded-xl border border-cream-dark/80 bg-cream/35 px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-charcoal">{subject}</p>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">{channel}</span>
      </div>
      <p className="mt-2 text-[13px] text-charcoal/68 leading-relaxed">{preview}</p>
      <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-charcoal/45">{when}</p>
    </div>
  );
}
