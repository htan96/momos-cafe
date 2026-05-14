import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { adminCatalogRows } from "@/lib/operations/mockAdminOps";

const stockTone: Record<string, string> = {
  low: "border-gold/40 bg-gold/[0.09] text-espresso/[0.88]",
  ok: "border-teal/24 bg-teal/[0.05] text-teal-dark/[0.78]",
  buffer: "border-charcoal/[0.1] bg-cream-dark/38 text-charcoal/70",
};

export default function AdminCatalogPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Catalog & publishing" subtitle="Operational lens on catalog health — mocks only." />

      <OpsPanel title="SKU catalog" eyebrow="Shop · menu · catering">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-cream-dark/70 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Channel</th>
                <th className="py-2 pr-3">Inventory band</th>
                <th className="py-2">Publishing</th>
              </tr>
            </thead>
            <tbody>
              {adminCatalogRows.map((r) => (
                <tr key={r.id} className="border-b border-cream-dark/38">
                  <td className="py-3 pr-3 font-semibold text-charcoal">{r.name}</td>
                  <td className="py-3 pr-3 font-mono text-[12px] text-charcoal/60">{r.sku}</td>
                  <td className="py-3 pr-3">{r.channel}</td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${stockTone[r.stockBand] ?? ""}`}>
                      {r.stockBand === "buffer" ? "Buffer" : r.stockBand === "low" ? "Low floor" : "Healthy"}
                    </span>
                  </td>
                  <td className="py-3">
                    <OpsStatusPill variant={r.publishing} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OpsPanel>
    </div>
  );
}
