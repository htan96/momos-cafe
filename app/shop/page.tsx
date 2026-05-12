"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useAdminSettings, DEFAULT_SETTINGS } from "@/lib/useAdminSettings";
import ShopComingSoon from "@/components/shop/ShopComingSoon";
import ShopHero from "@/components/sections/shop/ShopHero";
import ShopFlowRibbon from "@/components/sections/shop/ShopFlowRibbon";
import FeaturedCollections from "@/components/sections/shop/FeaturedCollections";
import CollectionFilterBar from "@/components/sections/shop/CollectionFilterBar";
import ShopFulfillmentStrip from "@/components/sections/shop/ShopFulfillmentStrip";
import MerchProductGrid from "@/components/sections/shop/MerchProductGrid";
import MerchProductSheet from "@/components/sections/shop/MerchProductSheet";
import MerchFulfillmentSection from "@/components/sections/shop/MerchFulfillmentSection";
import ShopCTA from "@/components/sections/shop/ShopCTA";
import { merchCatalog } from "@/lib/merch/mockCatalog";
import { STORE_COLLECTIONS } from "@/lib/merch/collections";
import type { MerchProduct, StoreCollectionId } from "@/types/merch";
import { useMerchCart } from "@/context/MerchCartContext";
import { useToast } from "@/context/ToastContext";

type SortKey = "featured" | "price_asc" | "price_desc" | "name";

function filterByCollection(
  products: MerchProduct[],
  activeId: StoreCollectionId | "all"
): MerchProduct[] {
  if (activeId === "all") return products;
  return products.filter(
    (p) =>
      p.collectionId === activeId ||
      p.featuredCollectionIds?.includes(activeId)
  );
}

function sortProducts(products: MerchProduct[], sort: SortKey): MerchProduct[] {
  const copy = [...products];
  const collectionOrder = STORE_COLLECTIONS.map((c) => c.id);

  switch (sort) {
    case "price_asc":
      copy.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      copy.sort((a, b) => b.price - a.price);
      break;
    case "name":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default: {
      copy.sort((a, b) => {
        const ai = collectionOrder.indexOf(a.collectionId);
        const bi = collectionOrder.indexOf(b.collectionId);
        if (ai !== bi) return ai - bi;
        const ab = a.badges?.includes("New") ? 1 : 0;
        const bb = b.badges?.includes("New") ? 1 : 0;
        return bb - ab;
      });
    }
  }
  return copy;
}

export default function ShopPage() {
  const { settings } = useAdminSettings();
  const isShopUnlocked =
    settings?.isShopUnlocked ?? DEFAULT_SETTINGS.isShopUnlocked;

  const [products, setProducts] = useState<MerchProduct[]>(merchCatalog);
  const [catalogSource, setCatalogSource] = useState<string>("mock_seed");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/products/store", { cache: "no-store" });
        const data = (await res.json()) as { source?: string; products?: MerchProduct[] };
        if (cancelled || !Array.isArray(data.products)) return;
        setProducts(data.products);
        setCatalogSource(data.source ?? "unknown");
      } catch {
        if (!cancelled) {
          setProducts(merchCatalog);
          setCatalogSource("client_fallback_error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [activeCollection, setActiveCollection] = useState<
    StoreCollectionId | "all"
  >("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [sheetProduct, setSheetProduct] = useState<MerchProduct | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { addMerchLine } = useMerchCart();
  const showToast = useToast();

  const visibleProducts = useMemo(() => {
    const filtered = filterByCollection(products, activeCollection);
    return sortProducts(filtered, sort);
  }, [products, activeCollection, sort]);

  const openSheet = useCallback((product: MerchProduct) => {
    setSheetProduct(product);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setTimeout(() => setSheetProduct(null), 200);
  }, []);

  const handleQuickAdd = useCallback(
    (product: MerchProduct) => {
      if (product.inventory === "out_of_stock") return;
      const vo = product.variantOptions;
      const sole = vo?.length === 1 ? vo[0] : undefined;
      addMerchLine({
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice:
          sole?.priceUsd ??
          (product.amountOptions?.length ? product.amountOptions[0]! : product.price),
        variantSummary: sole
          ? sole.label
          : product.amountOptions?.length
            ? `${product.amountOptions[0]} gift card`
            : "One size",
        squareVariationId: sole?.squareVariationId,
        image: product.image,
        fulfillmentSlug: product.fulfillment.slug,
      });
      showToast(`${product.name} added to shop bag`);
    },
    [addMerchLine, showToast]
  );

  if (!isShopUnlocked) {
    return <ShopComingSoon />;
  }

  return (
    <main className="bg-cream pb-28 md:pb-16">
      <ShopHero />
      <ShopFlowRibbon />

      <FeaturedCollections
        activeId={activeCollection}
        onSelect={(id) => {
          setActiveCollection(id);
          document.getElementById("shop-catalog")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      />

      <section
        id="shop-catalog"
        className="py-8 md:py-12 scroll-mt-[72px]"
        aria-label="Product catalog"
      >
        <div className="container max-w-[1200px] mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark mb-1">
                Catalog
              </p>
              <h2 className="font-display text-2xl md:text-[clamp(28px,4vw,40px)] text-charcoal leading-tight">
                Momo&apos;s retail picks
              </h2>
              <p className="text-[13px] text-charcoal/55 mt-2 max-w-xl">
                {catalogSource === "product_cache"
                  ? "Synced from Square’s retail “Store” category through Momo’s catalog cache."
                  : catalogSource === "mock_catalog_fallback"
                    ? "Showing mock assortment until production catalog sync hydrates the cache."
                    : catalogSource === "mock_seed"
                      ? "Loading catalog…"
                      : catalogSource === "client_fallback_error"
                        ? "Could not reach the catalog API — showing offline assortment."
                        : "Catalog preview"}
              </p>
            </div>

            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/45 shrink-0 md:min-w-[200px]">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm font-medium text-charcoal normal-case tracking-normal"
              >
                <option value="featured">Featured</option>
                <option value="price_asc">Price · Low to high</option>
                <option value="price_desc">Price · High to low</option>
                <option value="name">Name · A–Z</option>
              </select>
            </label>
          </div>

          <ShopFulfillmentStrip />

          <CollectionFilterBar
            activeId={activeCollection}
            onSelect={setActiveCollection}
          />

          <div className="mt-6 md:mt-8">
            <MerchProductGrid
              products={visibleProducts}
              onConfigureProduct={openSheet}
              onQuickAddProduct={handleQuickAdd}
            />
          </div>
        </div>
      </section>

      <MerchFulfillmentSection />
      <ShopCTA />

      <MerchProductSheet product={sheetProduct} open={sheetOpen} onClose={closeSheet} />
    </main>
  );
}
