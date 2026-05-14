import type { ReactNode } from "react";

export default function CustomerPanel({
  id,
  title,
  eyebrow,
  children,
  className = "",
  paddingClassName = "p-6 md:p-7",
}: {
  id?: string;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  paddingClassName?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-2xl border border-charcoal/[0.08] bg-white/92 shadow-[0_6px_28px_rgba(24,20,16,0.05)] ${className}`}
    >
      <div className={paddingClassName}>
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark/90">{eyebrow}</p>
        ) : null}
        {title ? (
          <h2 className={`font-display text-xl text-charcoal tracking-tight ${eyebrow ? "mt-2" : ""}`}>
            {title}
          </h2>
        ) : null}
        <div className={title || eyebrow ? "mt-6" : ""}>{children}</div>
      </div>
    </section>
  );
}
