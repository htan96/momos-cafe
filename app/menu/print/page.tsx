"use client";

import { useEffect, useState } from "react";
import { MenuCategory, MenuItem } from "@/types/menu";

// Category type → print page mapping
const PAGE_1_TYPES = ["breakfast"];
const PAGE_2_TYPES = ["lunch", "main", "featured"];
// PAGE_3 = everything else (sides, drinks, special)

export default function PrintMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/menu", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Preserve API-returned order (display_order ties respected)
  const sortByOrder = (cats: MenuCategory[]) =>
    [...cats].sort((a, b) => a.display_order - b.display_order);

  const page1 = sortByOrder(
    categories.filter((c) => PAGE_1_TYPES.includes(c.type ?? ""))
  );
  const page2 = sortByOrder(
    categories.filter((c) => PAGE_2_TYPES.includes(c.type ?? ""))
  );
  const page3 = sortByOrder(
    categories.filter(
      (c) =>
        !PAGE_1_TYPES.includes(c.type ?? "") &&
        !PAGE_2_TYPES.includes(c.type ?? "")
    )
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8e0d8]">
        <p className="text-teal font-semibold tracking-wide">
          Loading menu…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8e0d8]">
        <div className="text-center">
          <p className="text-charcoal font-semibold mb-2">
            Could not load menu data
          </p>
          <p className="text-gray-mid text-sm">
            Check that the Square API is configured and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>

      {/* Print button — hidden during print via .no-print */}
      <div className="no-print">
        <button onClick={() => window.print()} className="print-btn">
          Print Menu
        </button>
      </div>

      {/* Four pages: cover + 3 menu pages */}
      <div className="menu-wrap">
        <CoverPage />
        <MenuPage title="Breakfast" categories={page1} breakBefore />
        <MenuPage title="Lunch" categories={page2} breakBefore />
        <MenuPage title="Extras &amp; Drinks" categories={page3} breakBefore />
      </div>
    </>
  );
}

/* ─── Cover page ───────────────────────────────────────────────────────── */

function CoverPage() {
  return (
    <div className="menu-page cover-page">
      <div className="cover-inner">

        {/* Logo */}
        <div className="cover-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Momo's Café"
            className="cover-logo"
          />
        </div>

        {/* Name + rule */}
        <div className="cover-rule" />
        <p className="cover-label">Our Menu</p>
        <div className="cover-rule cover-rule--faint" />

        {/* Info block */}
        <div className="cover-info">
          <p className="cover-address">
            1922 Broadway St&nbsp;&nbsp;·&nbsp;&nbsp;Vallejo, CA 94590
          </p>
          <p className="cover-hours">
            Wednesday – Sunday&nbsp;&nbsp;·&nbsp;&nbsp;8:00 AM – 4:00 PM
          </p>
          <p className="cover-contact">
            (707) 654‑7180&nbsp;&nbsp;·&nbsp;&nbsp;momovallejo.com
          </p>
        </div>

        {/* Catering callout */}
        <div className="cover-catering">
          <p className="cover-catering-label">Catering Available</p>
          <p className="cover-catering-sub">
            Hosting an event? We&apos;d love to be part of it.
            <br />
            Reach out at&nbsp;
            <span className="cover-catering-contact">momovallejo.com</span>
            &nbsp;or call us to plan your next gathering.
          </p>
        </div>

      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

function MenuPage({
  title,
  categories,
  breakBefore = false,
}: {
  title: string;
  categories: MenuCategory[];
  breakBefore?: boolean;
}) {
  const activeCategories = categories.filter(
    (c) => c.menuitems?.some((i) => i.is_active)
  );
  if (activeCategories.length === 0) return null;

  return (
    <div className={`menu-page${breakBefore ? " page-break" : ""}`}>
      {/* Per-page brand mark */}
      <div className="page-brand">
        <span className="brand-text">Momo&apos;s Café</span>
        <span className="brand-dot" />
        <span className="brand-sub">Vallejo, CA</span>
      </div>
      <div className="brand-rule" />

      {/* Big page title */}
      <h1 className="page-title">{title}</h1>

      {/* Category sections */}
      {activeCategories.map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}
    </div>
  );
}

/* ─── Category ──────────────────────────────────────────────────────────── */

function CategorySection({ category }: { category: MenuCategory }) {
  const items = category.menuitems?.filter((i) => i.is_active) ?? [];
  if (items.length === 0) return null;

  return (
    <div className="cat-section">
      <div className="cat-header">
        <span className="cat-name">{category.name}</span>
        <span className="cat-line" />
      </div>

      <div className="cat-items">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

/* ─── Item row ──────────────────────────────────────────────────────────── */

function ItemRow({ item }: { item: MenuItem }) {
  const price =
    item.price != null ? `$${item.price.toFixed(2)}` : null;

  return (
    <div className="item-row">
      <div className="item-top">
        <span className="item-name">{item.name}</span>
        {price && <span className="item-price">{price}</span>}
      </div>
      {item.description && (
        <p className="item-desc">{item.description}</p>
      )}
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */

const PRINT_STYLES = `
/* ╔══════════════════════════════════════════╗
   ║   SCREEN — paper-preview aesthetic       ║
   ╚══════════════════════════════════════════╝ */

.menu-wrap {
  background: #d8d0c8;
  min-height: 100vh;
  padding: 48px 20px 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 56px;
}

.menu-page {
  background: #fffaf2;
  width: 100%;
  max-width: 720px;
  padding: 56px 64px 64px;
  border-radius: 2px;
  box-shadow:
    0 1px 3px rgba(0,0,0,0.08),
    0 4px 16px rgba(0,0,0,0.10),
    0 12px 40px rgba(0,0,0,0.08);
}

/* Brand header */
.page-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.brand-text {
  font-family: "Playfair Display", serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #2f6d66;
}
.brand-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #d4af37;
  flex-shrink: 0;
}
.brand-sub {
  font-family: Inter, sans-serif;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6B6B6B;
}
.brand-rule {
  height: 1px;
  background: linear-gradient(to right, #d4af37 0%, #d4af37 30%, rgba(212,175,55,0.15) 100%);
  margin-bottom: 32px;
}

/* Page title */
.page-title {
  font-family: "Playfair Display", serif;
  font-size: 48px;
  font-weight: 700;
  color: #2e2a25;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 0 0 40px;
}

/* Category section */
.cat-section {
  margin-bottom: 32px;
}
.cat-section:last-child {
  margin-bottom: 0;
}

/* Category header row */
.cat-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 4px;
  padding-bottom: 10px;
  border-bottom: 1.5px solid #EDE3B2;
}
.cat-name {
  font-family: Inter, sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #2f6d66;
  white-space: nowrap;
}
.cat-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, rgba(212,175,55,0.5) 0%, transparent 100%);
}

/* Items list — single column on screen */
.cat-items {
  display: flex;
  flex-direction: column;
}

/* Item row */
.item-row {
  padding: 9px 0;
  border-bottom: 1px solid rgba(245,229,192,0.7);
}
.item-row:last-child {
  border-bottom: none;
}
.item-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 20px;
}
.item-name {
  font-family: Inter, sans-serif;
  font-size: 14.5px;
  font-weight: 600;
  color: #2e2a25;
  line-height: 1.3;
}
.item-price {
  font-family: Inter, sans-serif;
  font-size: 14.5px;
  font-weight: 600;
  color: #2e2a25;
  white-space: nowrap;
  flex-shrink: 0;
}
.item-desc {
  font-family: Inter, sans-serif;
  font-size: 12px;
  color: #6B6B6B;
  line-height: 1.55;
  margin: 3px 0 0;
}

/* ── Cover page ── */
.cover-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 860px;
}
.cover-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  max-width: 480px;
  padding: 16px 0;
}

.cover-logo-wrap {
  margin-bottom: 32px;
}
.cover-logo {
  width: 200px;
  height: auto;
  display: block;
  margin: 0 auto;
}

.cover-rule {
  width: 100%;
  height: 1px;
  background: linear-gradient(to right, transparent, #d4af37 30%, #d4af37 70%, transparent);
  margin: 20px 0;
}
.cover-rule--faint {
  background: linear-gradient(to right, transparent, rgba(212,175,55,0.35) 30%, rgba(212,175,55,0.35) 70%, transparent);
  margin-top: 24px;
}

.cover-label {
  font-family: Inter, sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #2f6d66;
  margin: 0;
}

.cover-info {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cover-address {
  font-family: "Playfair Display", serif;
  font-size: 15px;
  color: #2e2a25;
  margin: 0;
  font-style: italic;
}
.cover-hours {
  font-family: Inter, sans-serif;
  font-size: 13px;
  color: #2e2a25;
  font-weight: 500;
  margin: 4px 0 0;
}
.cover-contact {
  font-family: Inter, sans-serif;
  font-size: 12.5px;
  color: #6B6B6B;
  margin: 2px 0 0;
  letter-spacing: 0.01em;
}

.cover-catering {
  margin-top: 40px;
  border: 1.5px solid #d4af37;
  border-radius: 6px;
  padding: 22px 32px;
  width: 100%;
  background: rgba(212,175,55,0.05);
}
.cover-catering-label {
  font-family: Inter, sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #2f6d66;
  margin: 0 0 10px;
}
.cover-catering-sub {
  font-family: Inter, sans-serif;
  font-size: 13px;
  color: #2e2a25;
  line-height: 1.65;
  margin: 0;
}
.cover-catering-contact {
  color: #2f6d66;
  font-weight: 600;
}

/* Print button */
.print-btn {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 999;
  background: #a00;
  color: #fff;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 14px 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 3px 0 #800, 0 6px 20px rgba(128,0,0,0.3);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.print-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 0 #800, 0 8px 24px rgba(128,0,0,0.35);
}
.print-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 0 #800;
}

/* ╔══════════════════════════════════════════╗
   ║   PRINT                                  ║
   ╚══════════════════════════════════════════╝ */

@media print {
  @page {
    size: letter portrait;
    margin: 0.55in 0.6in;
  }

  /* Hide all site chrome */
  header, footer, nav, .no-print {
    display: none !important;
  }

  body {
    background: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Cover page in print ── */
  .cover-page {
    min-height: 0 !important;
    height: 100vh !important;
    page-break-after: always !important;
    break-after: page !important;
  }
  .cover-logo { width: 180px !important; }

  /* ── Layout reset ── */
  .menu-wrap {
    background: white !important;
    padding: 0 !important;
    gap: 0 !important;
    display: block !important;
    align-items: unset !important;
  }

  .menu-page {
    box-shadow: none !important;
    border-radius: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    background: white !important;
  }

  /* ── Page breaks ── */
  .page-break {
    break-before: page;
    page-break-before: always;
  }

  /* ── Brand header (compact) ── */
  .page-brand { margin-bottom: 6px !important; }
  .brand-rule  { margin-bottom: 14px !important; }

  /* ── Page title (compact but prominent) ── */
  .page-title {
    font-size: 34px !important;
    margin-bottom: 16px !important;
  }

  /* ── Category sections (tight) ── */
  .cat-section {
    margin-bottom: 13px !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .cat-header {
    padding-bottom: 6px !important;
    margin-bottom: 2px !important;
  }

  /* ── Two-column item grid (print only) ── */
  /* Screen uses flex column; print uses 2-col grid to fit 3 pages */
  .cat-items {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 0 36px !important;
  }

  /* ── Item rows (compact) ── */
  .item-row {
    padding: 5px 0 !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .item-name  { font-size: 12px !important; line-height: 1.25 !important; }
  .item-price { font-size: 12px !important; }
  .item-desc  {
    font-size: 10px !important;
    line-height: 1.35 !important;
    margin-top: 1px !important;
    /* Cap at 2 lines so one long description can't blow the row */
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
  }
}
`;
