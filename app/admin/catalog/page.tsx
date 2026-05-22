import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import type { OpsStatusVariant } from "@/components/operations/opsTokens";
import { loadAdminCatalogProductRows } from "@/lib/admin/adminConsoleLoaders";

const stockTone: Record<string, string> = {
  low: "border-gold/40 bg-gold/[0.09] text-espresso/[0.88]",
  ok: "border-teal/24 bg-teal/[0.05] text-teal-dark/[0.78]",
  buffer: "border-charcoal/[0.1] bg-cream-dark/38 text-charcoal/70",
  unknown: "border-charcoal/[0.1] bg-cream/55 text-charcoal/60",
};

function stockBand(qoh: number | null | undefined): { band: keyof typeof stockTone; label: string } {
  if (qoh == null || Number.isNaN(qoh)) return { band: "unknown", label: "Qty unknown" };
  if (qoh < 3) return { band: "low", label: "Low floor" };
  if (qoh > 200) return { band: "buffer", label: "Buffer" };
  return { band: "ok", label: "Healthy" };
}

function publishingVariant(isAvailable: boolean): OpsStatusVariant {
  return isAvailable ? "delivered" : "blocked";
}

export default async function AdminCatalogPage() {
  const rows = await loadAdminCatalogProductRows(40);

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Catalog & publishing"
        subtitle="ProductCache + first ProductVariantCache row — inventory truth remains Square-side."
      />

      <OpsPanel title="SKU catalog" eyebrow="Shop cache">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-cream-dark/70 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Channel</th>
                <th className="py-2 pr-3">Inventory band</th>
                <th className="py-2">Availability</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="py-4 text-charcoal/58" colSpan={5}>
                    Product cache empty — run catalog sync tooling.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const v = r.variants[0];
                  const sku = v?.sku?.trim()?.length ? v.sku : v?.squareVariationId ?? r.squareCatalogItemId;
                  const { band, label } = stockBand(v?.quantityOnHand ?? null);
                  return (
                    <tr key={r.id} className="border-b border-cream-dark/38">
                      <td className="py-3 pr-3 font-semibold text-charcoal">{r.title}</td>
                      <td className="py-3 pr-3 font-mono text-[12px] text-charcoal/60">{sku}</td>
                      <td className="py-3 pr-3">{r.slug?.length ? `/${r.slug}` : "Store catalog"}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                            stockTone[band] ?? ""
                          }`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="py-3">
                        <OpsStatusPill variant={publishingVariant(r.isAvailable)} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </OpsPanel>
    </div>
  );
}
