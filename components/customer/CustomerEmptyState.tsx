export default function CustomerEmptyState({
  title,
  body,
  footnote,
}: {
  title: string;
  body: string;
  footnote?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gold/40 bg-cream/45 px-6 py-12 text-center">
      <p className="font-display text-lg text-charcoal tracking-tight">{title}</p>
      <p className="mt-3 mx-auto max-w-md text-[14px] text-charcoal/68 leading-relaxed">{body}</p>
      {footnote ? (
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">{footnote}</p>
      ) : null}
    </div>
  );
}
