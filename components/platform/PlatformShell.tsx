"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import SignOutButton from "@/app/account/SignOutButton";
import { pathMatchesNav } from "@/lib/navigation/pathMatchesNav";

export type PlatformShellVariant = "customer" | "admin" | "super_admin";

/** `section` groups items in the desktop sidebar (aside is `lg+` only). */
export type PlatformNavItem = { href: string; label: string; section?: string };

type Props = {
  variant: PlatformShellVariant;
  /** Optional subdued surface label — pass when you want a visible environment hint (layouts may omit). */
  environment?: PlatformShellVariant;
  areaEyebrow: string;
  areaTitle: string;
  navItems: PlatformNavItem[];
  children: React.ReactNode;
  userHint?: string | null;
};

const shellTheme: Record<
  PlatformShellVariant,
  {
    topBar: string;
    eyebrowClass: string;
    titleClass: string;
    storefrontClass: string;
    signOutButtonClass?: string;
    userHintClass: string;
    sidebarActive: string;
    sidebarIdle: string;
  }
> = {
  customer: {
    topBar: "bg-cream border-b-[3px] border-gold",
    eyebrowClass: "text-teal-dark",
    titleClass: "text-charcoal",
    storefrontClass:
      "text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/50 hover:text-teal-dark transition-colors",
    userHintClass: "text-charcoal/55",
    sidebarActive: "bg-teal/12 text-teal-dark font-semibold",
    sidebarIdle: "text-charcoal/65 hover:bg-cream-dark/35 hover:text-charcoal",
  },
  admin: {
    topBar: "bg-cream border-b-[3px] border-gold",
    eyebrowClass: "text-teal-dark",
    titleClass: "text-charcoal",
    storefrontClass:
      "text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/50 hover:text-red transition-colors",
    userHintClass: "text-charcoal/55",
    sidebarActive: "bg-red/10 text-red font-semibold",
    sidebarIdle: "text-charcoal/65 hover:bg-cream-dark/40 hover:text-charcoal",
  },
  super_admin: {
    topBar: "bg-teal-dark border-b-[3px] border-gold/90",
    eyebrowClass: "text-gold",
    titleClass: "text-cream font-display tracking-tight",
    storefrontClass:
      "text-[12px] font-semibold uppercase tracking-[0.14em] text-cream/75 hover:text-cream transition-colors",
    signOutButtonClass:
      "text-[13px] font-semibold text-cream/80 hover:text-cream underline-offset-2 hover:underline disabled:opacity-50",
    userHintClass: "text-cream/70",
    sidebarActive: "bg-teal/14 text-teal-dark font-semibold border border-teal/25",
    sidebarIdle: "text-charcoal/65 hover:bg-cream-dark/45 hover:text-charcoal",
  },
};

const environmentBadgeTone: Record<PlatformShellVariant, string> = {
  customer: "bg-teal-dark/90 text-white",
  admin: "bg-red text-white",
  super_admin: "bg-gold/95 text-teal-dark",
};

function environmentBadgeLabel(surface: PlatformShellVariant): string {
  if (surface === "super_admin") return "Platform";
  if (surface === "admin") return "Admin";
  return "Customer";
}

export default function PlatformShell({
  variant,
  environment,
  areaEyebrow,
  areaTitle,
  navItems,
  children,
  userHint,
}: Props) {
  const pathname = usePathname() ?? "";
  const theme = shellTheme[variant];

  function sidebarNavClass(href: string) {
    const base =
      "rounded-lg px-3 py-2 text-[13px] uppercase tracking-[0.12em] transition-colors duration-150";
    return `${base} ${pathMatchesNav(pathname, href) ? theme.sidebarActive : theme.sidebarIdle}`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gold/[0.08] via-cream-dark/40 to-cream-dark/20 border-t-[3px] border-gold/65">
      <header className={`sticky top-16 z-[800] shrink-0 ${theme.topBar}`}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[4.25rem] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${theme.eyebrowClass}`}>
                  {areaEyebrow}
                </span>
                {environment ? (
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-[0.16em] px-2 py-[3px] rounded-md shadow-sm shrink-0 ${environmentBadgeTone[environment]}`}
                  >
                    {environmentBadgeLabel(environment)}
                  </span>
                ) : null}
              </div>
              <span className={`text-[15px] truncate ${theme.titleClass}`}>{areaTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-5 shrink-0">
            <Link href="/" className={theme.storefrontClass} title="Momo’s Café storefront">
              Storefront
            </Link>
            {userHint ? (
              <span
                className={`hidden lg:inline max-w-[220px] truncate text-[12px] ${theme.userHintClass}`}
                title={userHint}
              >
                {userHint}
              </span>
            ) : null}
            <SignOutButton className={theme.signOutButtonClass} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-w-0 max-w-[1200px] w-full mx-auto">
        <aside
          className="hidden lg:flex w-[236px] shrink-0 flex-col border-r border-cream-dark/50 bg-cream/75 backdrop-blur-[2px] py-10 px-4"
          aria-label="Section navigation"
        >
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item, i) => {
              const prev = i > 0 ? navItems[i - 1] : undefined;
              const showHeading = item.section && item.section !== prev?.section;
              return (
                <Fragment key={item.href}>
                  {showHeading ? (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/45 pt-3 pb-1 first:pt-0">
                      {item.section}
                    </p>
                  ) : null}
                  <Link href={item.href} className={sidebarNavClass(item.href)}>
                    {item.label}
                  </Link>
                </Fragment>
              );
            })}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
