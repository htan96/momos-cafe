import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/getCustomerSession";
import SignOutButton from "./SignOutButton";

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/login?next=/account");
  }

  return (
    <div className="max-w-[640px] mx-auto px-6 md:px-0 py-14 md:py-20">
      <p className="text-[11px] uppercase tracking-[0.22em] text-teal-dark font-semibold">Your account</p>
      <h1 className="mt-2 text-3xl font-semibold text-charcoal font-display tracking-tight">
        Hello again
      </h1>
      <p className="mt-3 text-[15px] text-charcoal/75 leading-relaxed">
        Signed in as <span className="font-medium text-charcoal">{session.email}</span>
      </p>

      <div className="mt-10 rounded-xl border border-gold/35 bg-white p-6 shadow-sm">
        <p className="text-[15px] text-charcoal/80 leading-relaxed">
          Order history, pickup status, and saved preferences will appear here as we roll out the full account
          experience.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href="/order"
            className="inline-flex items-center rounded-lg bg-red px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-red-dark transition-colors"
          >
            Order pickup
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center rounded-lg border border-charcoal/15 px-4 py-2.5 text-[14px] font-semibold text-charcoal hover:bg-cream-mid/80 transition-colors"
          >
            Browse merch
          </Link>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
