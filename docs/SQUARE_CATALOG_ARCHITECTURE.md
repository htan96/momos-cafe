# Square catalog architecture (Momo’s)

This document explains how **Square Catalog** is structured in the API, how Momo’s **discovers** it today, and how the new **normalization layer** should evolve. It complements live inspection via **`GET /api/square/catalog/discovery`** (read-only; requires `INTERNAL_API_SECRET`).

---

## How Square catalog is actually structured

Square exposes a **graph of catalog objects**, not a strict SQL schema. Each object has:

- **`id`**: stable catalog object id (used in Orders, Payments, Images).
- **`type`**: `ITEM`, `ITEM_VARIATION`, `CATEGORY`, `MODIFIER_LIST`, `MODIFIER`, `IMAGE`, etc.
- **Type-specific payload** nested under either camelCase (`itemData`) or snake_case (`item_data`) depending on the JSON path.

### Categories

- **`CATEGORY`** objects carry `name`, `ordinal`, and optional **`parentCategory`** / **`parent_category`** pointing at another category.
- Hierarchy is **parent/child links**, not a materialized path. You derive trees by walking `parentCategory` upward from any node.
- Items link to categories via **`itemData.categories`** (array of `{ id }`) and/or legacy **`categoryIds`** fields—not “one category only” in the general case.

### Items and variations

- **`ITEM`** holds merchandising fields (`name`, `description`, `productType`, images, etc.) and **`variations`**: usually references to **`ITEM_VARIATION`** objects (sometimes thin references with only `catalogObjectId`).
- **`ITEM_VARIATION`** holds **price**, **SKU**, **inventory tracking**, **`itemId` / `item_id`** back to the parent ITEM.
- **Pricing** is on the variation, not the item.

### Modifiers (critical)

- **`MODIFIER_LIST`** defines a named group (`selectionType`, min/max selected) and an ordered list of **`MODIFIER`** ids (options).
- **`MODIFIER`** rows belong to exactly one list via **`modifierListId`** / **`modifier_list_id`** (and price overrides per option).
- **Attachment to an item** is expressed on the **ITEM** as **`modifierListInfo` / `modifier_list_info`**: an array of structures referencing **`modifierListId`** and optional min/max overrides. This is the **source of truth** for “which modifier groups apply to this item”—not “all lists in the catalog,” and not global inheritance unless Square returns it that way.

Batch retrieval **`catalog.batchGet`** with **`includeRelatedObjects: true`** is required to reliably resolve related `MODIFIER_LIST` / `MODIFIER` / `ITEM_VARIATION` payloads that may be missing from a plain `catalog.list` page.

### Images

- **`IMAGE`** objects store CDN **`url`** once processed; items reference image ids.

### Inventory

- **`inventory.batchGetCounts`** is keyed by **catalog object id** (typically **ITEM_VARIATION** ids for sellable SKUs) and **location**.

### Visibility / archiving

- Objects may carry **`isDeleted` / `is_deleted`** when removed from catalog.
- Items also have channel / availability fields (e.g. online / pickup) depending on account settings; discovery reports surface raw `productType` and category linkage first—**channel rules** should be layered after measurement.

---

## How Momo’s inspected and normalized it (Phase 1)

### Module layout

| Path | Role |
|------|------|
| `lib/square/catalogDiscovery/snapshot.ts` | Read-only `catalog.list` + `batchGet` merge into `Map<id, CatalogObjectSummary>` |
| `lib/square/catalogDiscovery/analyze.ts` | Category trees, per-item inspection, modifier linkage checks, store-root detection |
| `lib/square/catalogDiscovery/types.ts` | Shared types for reports + `CommerceGraph` v1 |
| `lib/square/catalogDiscovery/index.ts` | `runCatalogDiscovery()` helper |

### HTTP introspection (read-only)

`GET /api/square/catalog/discovery`

- **Auth**: same as internal orchestration (`Authorization: Bearer <INTERNAL_API_SECRET>` or `x-momos-internal-secret`).
- **`mode=summary`**: full **`report`** + **`graph`** with items truncated (40) for payload size.
- **`mode=full`**: includes **`itemsDetailed`** (every item’s `ItemInspection`) — can be **very large**.
- **`mode=item&itemId=`**: one item, full modifier resolution audit.
- **`includeInventory=1`**: optional counts via `inventory.batchGetCounts` (needs `SQUARE_LOCATION_ID`).

### Modifier correctness signals

The analyzer computes:

- **`missingModifierListsReferencedByItems`**: list ids present on `modifierListInfo` but no `MODIFIER_LIST` object in the snapshot.
- **`itemsWithBrokenModifierOptionRefs`**: list resolves but listed option ids are not `MODIFIER` rows.
- **`orphanModifiers`**: `MODIFIER` with missing / unknown parent list id.

These flags explain “modifiers showing up wrong” **without guessing**: they compare **item-attached list ids** vs resolved catalog objects.

---

## Menu vs shop classification (foundation)

Today’s **high-confidence** rule used in `CommerceGraph`:

- If an item’s **category ancestry** intersects a Square category whose name matches **`Store`** (same constant as `storeCatalogSync.ts`), classify **`shop`**.
- Else if the item has **no categories**, mark **`ambiguous`** (data quality issue).
- Else default **`menu`** with **medium** confidence—this is a **starting signal**, not final fulfillment policy.

Future work: incorporate `productType`, channel fields, reporting categories, and explicit Square **custom attributes** once captured in the snapshot.

---

## Target architecture (normalization pipeline)

```
Square Catalog (API)
        ↓
  CatalogSnapshot   ← list + batchGet, no mutations
        ↓
  CatalogAnalysisReport ← trees, linkage checks, anomalies
        ↓
  CommerceGraph (v1) ← normalized nodes for categories, lists, items
        ↓
  Menu domain projection  (future: POS / kitchen constraints)
  Shop domain projection    (future: retail / shipping)
        ↓
  Unified commerce API for frontend (no raw Square on client)
```

**Frontend rule:** components consume **internal DTOs** built from `CommerceGraph` / downstream projections—not raw `CatalogObject` JSON.

---

## Relationship to existing code

- **`lib/square.ts` (`getMenuFromSquare`)** remains the live menu mapper; discovery tooling **does not replace** it yet—it **audits** reality so refactors are evidence-driven.
- **`lib/square/storeCatalogSync.ts`** continues to sync only the **Store** category into `product_cache`; discovery validates whether **Store** is root, nested, or duplicated by name.

---

## Operational notes

- **Production-safe**: discovery performs **GETs only** (list, batchGet, optional inventory counts).
- **Rate limits**: middleware + in-route IP throttle (see handler).
- **Large payloads**: use `mode=summary` first; escalate to `full` only when debugging.

---

## Verification checklist

1. Export `INTERNAL_API_SECRET` (24+ chars) on the server.
2. `curl` discovery `mode=summary` and confirm `report.countsByType` matches Square Dashboard counts (roughly).
3. Pick a problematic item id from Square; `mode=item` and inspect `modifierListResolution`.
4. If `missingModifierListsReferencedByItems` is non-empty, fix catalog data or batch merge before blaming UI.

---

## References

- Square Catalog API overview: https://developer.squareup.com/docs/catalog-api/what-it-does
- Catalog data model: https://developer.squareup.com/docs/catalog-api/data-model
