type Props = {
  name: string;
  depth: string;
  oldestAge: string;
  slaHint: string;
};

export default function QueueHealthRow({ name, depth, oldestAge, slaHint }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 py-3 border-b border-cream-dark/45 last:border-0 sm:grid-cols-12 sm:items-center sm:gap-4">
      <div className="sm:col-span-4">
        <p className="text-[13px] font-semibold text-charcoal">{name}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-charcoal/65 sm:col-span-8 sm:justify-end">
        <span>
          Depth <span className="tabular-nums font-medium text-charcoal/85">{depth}</span>
        </span>
        <span>
          Oldest <span className="tabular-nums font-medium text-charcoal/85">{oldestAge}</span>
        </span>
        <span className="text-charcoal/50">{slaHint}</span>
      </div>
    </div>
  );
}
