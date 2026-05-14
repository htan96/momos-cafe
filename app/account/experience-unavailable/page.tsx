import Link from "next/link";
import SignOutButton from "@/app/account/SignOutButton";

/** Shown when the customer account platform governance flag is off; stays outside `(main)` so it is not gated by PlatformShell navigations. */
export default function CustomerPlatformExperienceUnavailablePage() {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center px-5 py-14 md:px-8 lg:px-12">
      <article className="mx-auto max-w-lg rounded-[28px] border border-cream-dark/65 bg-white/90 px-7 py-9 shadow-sm md:px-10 md:py-11">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark">Your table with Momo&apos;s</p>
        <h1 className="mt-4 font-display text-[28px] leading-tight text-charcoal md:text-[32px] tracking-tight">
          We&apos;re preparing something extra hospitable here
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-charcoal/70">
          Your signed-in home for orders, gifts on the move, catering threads, and the little touches that remember how you dine with us isn&apos;t
          quite table-ready tonight. Browse the storefront as usual — we&apos;ll usher you back the moment we&apos;ve polished the linens.
        </p>
        <p className="mt-5 text-[14px] leading-relaxed text-charcoal/60">
          Thank you for your patience. Nothing changes at checkout — this pause is only for the enhanced account nook.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-teal-dark px-6 py-3 text-sm font-semibold text-cream transition hover:opacity-95"
          >
            Continue shopping
          </Link>
          <SignOutButton className="text-[13px] font-semibold text-charcoal/60 underline-offset-4 hover:text-charcoal hover:underline sm:text-right" />
        </div>
      </article>
    </div>
  );
}
