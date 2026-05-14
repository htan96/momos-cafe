type Props = {
  title: string;
  children: React.ReactNode;
};

export default function SecurityHighlight({ title, children }: Props) {
  return (
    <div className="rounded-xl border border-cream-dark/65 border-l-[3px] border-l-teal-dark/60 bg-teal/[0.035] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-dark/90">{title}</p>
      <div className="mt-1.5 text-[13px] text-charcoal/75 leading-snug">{children}</div>
    </div>
  );
}
