import Image from "next/image";
import Link from "next/link";
import { commerceCheckoutShell, commerceSectionSpacing } from "@/lib/commerce/tokens";

/** Page backdrop + centering — use in route layouts or pages. */
export function StorefrontAuthPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${commerceCheckoutShell.page} relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10 sm:py-14`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(193,154,53,0.12),transparent_58%),radial-gradient(ellipse_75%_45%_at_100%_105%,rgba(45,107,107,0.09),transparent_52%)]"
        aria-hidden
      />
      <div
        className={`relative z-[1] mx-auto flex w-full max-w-lg flex-col items-stretch ${commerceSectionSpacing.gap}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Lifted card — soft wash, gold edge, calm teal shadow. */
export function StorefrontAuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={[
        "relative w-full max-w-md sm:max-w-lg mx-auto overflow-hidden rounded-2xl",
        "border border-gold/45",
        "bg-gradient-to-br from-white via-cream/95 to-white",
        "shadow-[0_28px_64px_-18px_rgba(45,107,107,0.12),0_14px_36px_-14px_rgba(193,154,53,0.16),inset_0_1px_0_rgba(255,255,255,0.85)]",
        "px-5 py-9 sm:px-9 sm:py-10",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-teal/[0.04] via-transparent to-gold/[0.06]"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function StorefrontAuthLogo() {
  return (
    <Link
      href="/"
      className="mx-auto block w-fit shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
    >
      <Image
        src="/images/logo.png"
        alt="Momo's Café"
        width={220}
        height={110}
        className="h-12 w-auto sm:h-[3.75rem]"
        priority
      />
    </Link>
  );
}

/** In-body links (paragraphs, “sign-in by email”). */
export const storefrontAuthInlineLink =
  "font-semibold text-teal-dark underline decoration-gold/55 underline-offset-[3px] transition-colors hover:decoration-teal/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

/** Footer / secondary nav links — full-width tap targets on mobile. */
export const storefrontAuthFooterLink =
  "block w-full rounded-lg py-3 text-center text-[13px] text-charcoal/72 transition-colors hover:bg-cream-mid/40 hover:text-teal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:py-2.5";

export const storefrontAuthInput = [
  commerceCheckoutShell.input,
  "min-h-[48px] focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
].join(" ");

export const storefrontAuthPrimaryButton =
  "min-h-[48px] w-full rounded-xl bg-teal-dark px-4 py-3 text-[15px] font-semibold text-cream shadow-sm transition-[opacity,box-shadow] hover:shadow-md disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

/** Use sparingly — e.g. distinct confirmation actions. */
export const storefrontAuthAccentButton =
  "min-h-[48px] w-full rounded-xl bg-red px-4 py-3 text-[15px] font-semibold text-cream shadow-sm transition-[opacity,box-shadow] hover:brightness-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

export const storefrontAuthQuietButton =
  "min-h-[48px] w-full rounded-xl border border-teal-dark/35 bg-white/80 px-4 py-3 text-[14px] font-semibold text-teal-dark shadow-sm transition-colors hover:bg-teal/5 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cream";
