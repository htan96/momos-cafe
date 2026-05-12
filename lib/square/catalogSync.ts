/**
 * Square Catalog sync foundation — wire sandbox credentials later.
 * Keeps Square SDK / HTTP calls out of UI routes.
 */

export interface CatalogSyncResult {
  itemsUpserted: number;
  variantsUpserted: number;
  categoriesUpserted: number;
  message: string;
}

export async function syncSquareCatalogSandbox(): Promise<CatalogSyncResult> {
  const envReady =
    !!process.env.SQUARE_ACCESS_TOKEN && !!process.env.SQUARE_ENVIRONMENT;
  return {
    itemsUpserted: 0,
    variantsUpserted: 0,
    categoriesUpserted: 0,
    message: envReady
      ? "Square credentials detected — batch upsert not implemented in this phase."
      : "Set SQUARE_ACCESS_TOKEN + SQUARE_ENVIRONMENT (sandbox) to enable catalog sync.",
  };
}
