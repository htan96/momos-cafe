type Props = {
  title: string;
  description: string;
};

export default function PlatformPlaceholderCard({ title, description }: Props) {
  return (
    <article className="rounded-2xl border border-cream-dark/80 bg-white/90 shadow-sm px-6 py-7 md:px-8 md:py-9">
      <h1 className="font-display text-2xl md:text-[1.85rem] text-charcoal tracking-tight">{title}</h1>
      <p className="mt-4 text-[15px] text-charcoal/72 leading-relaxed max-w-xl">{description}</p>
    </article>
  );
}
