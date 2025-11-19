export default function MenuItem({
  name,
  price,
  description,
  addOns,
}: {
  name: string;
  price: number;
  description: string;
  addOns?: { name: string; price: number }[];
}) {
  return (
    <div className="group bg-brand-offwhite/40 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-baseline">
        <h3 className="text-lg font-semibold text-brand-charcoal group-hover:text-brand-teal transition">
          {name}
        </h3>
        <span className="text-brand-gold font-medium">${price}</span>
      </div>
      <p className="text-sm text-brand-charcoal/80 mt-1">{description}</p>

      {addOns && (
        <ul className="mt-2 text-sm text-brand-charcoal/70 space-y-1">
          {addOns.map((opt, i) => (
            <li key={i}>
              + {opt.name}{" "}
              <span className="text-brand-gold font-medium">
                (+${opt.price})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
