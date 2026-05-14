export type CustomerStatusVariant =
  | "preparing"
  | "shipped"
  | "delivered"
  | "exception"
  | "scheduled";

const tone: Record<
  CustomerStatusVariant,
  { chip: string }
> = {
  preparing: {
    chip:
      "bg-amber-50 text-amber-950/85 border-amber-200/80",
  },
  shipped: {
    chip:
      "bg-teal/10 text-teal-dark border-teal/25",
  },
  delivered: {
    chip:
      "bg-emerald-50 text-emerald-950/85 border-emerald-200/70",
  },
  exception: {
    chip:
      "bg-red/8 text-red border-red/25",
  },
  scheduled: {
    chip:
      "bg-violet-50 text-violet-950/85 border-violet-200/70",
  },
};

const label: Record<CustomerStatusVariant, string> = {
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  exception: "Needs attention",
  scheduled: "Scheduled",
};

export default function CustomerStatusChip({
  variant,
  text,
  className = "",
}: {
  variant: CustomerStatusVariant;
  text?: string;
  className?: string;
}) {
  const t = tone[variant];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${t.chip} ${className}`}
    >
      {text ?? label[variant]}
    </span>
  );
}
