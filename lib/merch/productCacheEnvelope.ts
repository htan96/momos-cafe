export const MOMOS_PRODUCT_CACHE_ENVELOPE_V = 1 as const;

export interface MomosProductCacheMerchMeta {
  leafCategorySquareId: string;
  ancestrySquareIdsLeafFirst: string[];
  storeRootSquareId: string;
}

export type MomosProductCacheEnvelope = {
  __momosProductCacheVersion: typeof MOMOS_PRODUCT_CACHE_ENVELOPE_V;
  squareItem: unknown;
  merch: MomosProductCacheMerchMeta;
};

export function wrapStoreProductCachePayload(
  squareItem: unknown,
  merch: MomosProductCacheMerchMeta
): MomosProductCacheEnvelope {
  return {
    __momosProductCacheVersion: MOMOS_PRODUCT_CACHE_ENVELOPE_V,
    squareItem,
    merch,
  };
}

export function unwrapProductCachePayload(data: unknown): {
  squareItem: Record<string, unknown>;
  merch?: MomosProductCacheMerchMeta;
} {
  if (data && typeof data === "object" && "__momosProductCacheVersion" in data) {
    const d = data as MomosProductCacheEnvelope;
    if (
      d.__momosProductCacheVersion === MOMOS_PRODUCT_CACHE_ENVELOPE_V &&
      d.squareItem &&
      typeof d.squareItem === "object"
    ) {
      return { squareItem: d.squareItem as Record<string, unknown>, merch: d.merch };
    }
  }
  return { squareItem: (data ?? {}) as Record<string, unknown> };
}
