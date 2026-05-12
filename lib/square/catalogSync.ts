/**
 * @deprecated Use `runProductionStoreCatalogSync` from `@/lib/square/storeCatalogSync`
 * and call `POST /api/square/catalog/sync` (internal-auth protected).
 */
export interface CatalogSyncResult {
  itemsUpserted: number;
  variantsUpserted: number;
  categoriesUpserted: number;
  message: string;
}

export async function syncSquareCatalogSandbox(): Promise<CatalogSyncResult> {
  return {
    itemsUpserted: 0,
    variantsUpserted: 0,
    categoriesUpserted: 0,
    message:
      "Deprecated stub — production sync lives in storeCatalogSync + POST /api/square/catalog/sync.",
  };
}
