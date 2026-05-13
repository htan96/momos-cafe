"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Menu,
  Package,
  Radio,
  Settings2,
  Ship,
  ShoppingBag,
  X,
} from "lucide-react";
import type { OpsRole } from "@/lib/ops/types";

const links = [
  { href: "/ops", label: "Today", icon: LayoutDashboard },
  { href: "/ops/fulfillment", label: "Fulfillment", icon: Package },
  { href: "/ops/orders", label: "Orders", icon: ShoppingBag },
  { href: "/ops/shipping", label: "Shipping", icon: Ship },
  { href: "/ops/communications", label: "Communications", icon: Radio },
  { href: "/ops/settings", label: "Settings", icon: Settings2 },
];

export default function OpsShell({
  email,
  role,
  children,
}: {
  email: string;
  role: OpsRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);

  async function logout() {
    await fetch("/api/ops/auth/logout", { method: "POST" });
    router.replace(`/ops/login?next=${encodeURIComponent("/ops")}`);
    router.refresh();
  }

  const NavBody = (
    <nav className="flex flex-col gap-1">
      <div className="px-3 mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8FC4C4]/90">Momo&apos;s</p>
        <p className="text-lg font-semibold text-[#f5e5c0] tracking-tight">Operations</p>
      </div>
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/ops" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setDrawer(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors ${
              active
                ? "bg-[#2f6d66]/25 text-[#f5e5c0] border border-[#2f6d66]/35"
                : "text-[#c9bba8] hover:bg-[#3d3830]/40 hover:text-[#f5e5c0]"
            }`}
          >
            <Icon className="h-4 w-4 opacity-90" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-[#141210] text-[#f5e5c0]">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-[#3d3830] bg-[#1c1916] px-3 py-6">
        {NavBody}
      </aside>

      {drawer ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close navigation"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[min(18rem,85vw)] bg-[#1c1916] border-r border-[#3d3830] p-4 shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold">Navigate</span>
              <button
                type="button"
                className="p-2 rounded-md hover:bg-[#3d3830]"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {NavBody}
          </div>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-[#3d3830] bg-[#1c1916]/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md hover:bg-[#3d3830]"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-[12px] text-[#c9bba8]/80 hidden sm:inline">
              Signed in as <span className="text-[#f5e5c0]">{email}</span>
              <span className="mx-2 text-[#3d3830]">|</span>
              <span className="uppercase tracking-wide text-[10px] text-[#8FC4C4]">{role}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-[12px] text-[#c9bba8] hover:text-[#f5e5c0] underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
