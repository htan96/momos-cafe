type Props = {
  title: string;
  body: string;
  children?: React.ReactNode;
};

export default function OpsEmptyState({ title, body, children }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-cream-dark/90 bg-cream/40 px-6 py-10 text-center">
      <p className="font-display text-lg text-charcoal">{title}</p>
      <p className="text-[14px] text-charcoal/65 mt-2 max-w-md mx-auto leading-relaxed">{body}</p>
      {children ? <div className="mt-6 flex justify-center">{children}</div> : null}
    </div>
  );
}
