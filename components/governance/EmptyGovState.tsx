type Props = {
  title: string;
  description: string;
};

export default function EmptyGovState({ title, description }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-cream-dark bg-cream-mid/20 px-5 py-8 text-center">
      <p className="font-display text-[17px] text-charcoal">{title}</p>
      <p className="mt-2 text-[13px] text-charcoal/60 max-w-md mx-auto leading-relaxed">{description}</p>
    </div>
  );
}
