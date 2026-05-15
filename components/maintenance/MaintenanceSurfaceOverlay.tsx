import { ShoppingBag, UtensilsCrossed } from "lucide-react";

export type MaintenanceSurface = "shop" | "menu";

const copy: Record<
  MaintenanceSurface,
  { title: string; subtitle: string }
> = {
  shop: {
    title: "The shop is temporarily offline",
    subtitle:
      "We are updating our retail storefront to improve your experience. Online ordering for Momo’s shop items will return shortly — thank you for your patience.",
  },
  menu: {
    title: "Menu ordering is paused",
    subtitle:
      "Our café menu and pickup ordering are briefly unavailable while we refresh the kitchen experience. Please check back soon, or visit us in person if we’re open.",
  },
};

export default function MaintenanceSurfaceOverlay(props: {
  surface: MaintenanceSurface;
  /** When true, the surface is open and children render normally. When false, a full-viewport maintenance layer is shown. */
  isOpen: boolean;
  children: React.ReactNode;
}) {
  const { surface, isOpen, children } = props;
  const { title, subtitle } = copy[surface];
  const contact = process.env.NEXT_PUBLIC_MAINTENANCE_CONTACT?.trim();

  if (isOpen) {
    return <>{children}</>;
  }

  const Icon = surface === "shop" ? ShoppingBag : UtensilsCrossed;

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden="true" className="pointer-events-none select-none opacity-40">
        {children}
      </div>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-charcoal/88 px-5 py-10 pointer-events-auto"
        role="alert"
        aria-live="polite"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-cream/95 px-8 py-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/12 text-teal-dark">
            <Icon className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="font-display text-2xl text-charcoal tracking-tight">{title}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-charcoal/75">{subtitle}</p>
          {contact ? (
            <p className="mt-8 text-[13px] text-charcoal/60">
              Questions? Reach us at{" "}
              <span className="font-medium text-charcoal/85">{contact}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
