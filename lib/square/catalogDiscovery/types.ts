/**
 * Types for Square catalog discovery → analysis → normalization (read-only).
 * Field names follow Square JSON both camelCase (SDK) and snake_case where APIs emit it.
 */

export type CatalogDiscoveryMode = "summary" | "full" | "item";

/** One catalog object with a compact shape for analysis (full raw optional). */
export interface CatalogObjectSummary {
  id: string;
  type: string;
  isDeleted?: boolean;
  ordinal?: number;
  /** CATEGORY */
  categoryName?: string;
  parentCategoryId?: string | null;
  /** ITEM */
  itemName?: string;
  productType?: string;
  categoryIds: string[];
  variationIds: string[];
  imageIds: string[];
  modifierListInfoEntries: CatalogModifierListInfoEntry[];
  /** ITEM_VARIATION */
  variationName?: string;
  parentItemId?: string;
  sku?: string;
  priceAmount?: string;
  /** MODIFIER_LIST */
  modifierListName?: string;
  modifierChildIds: string[];
  selectionType?: string;
  minSelected?: number;
  maxSelected?: number;
  /** MODIFIER */
  modifierName?: string;
  modifierListId?: string;
  modifierPriceAmount?: string;
  /** IMAGE */
  imageUrl?: string;
}

export interface CatalogModifierListInfoEntry {
  modifierListId: string;
  enabled?: boolean;
  minSelectedModifiers?: number;
  maxSelectedModifiers?: number;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  ordinal: number;
  parentId: string | null;
  children: CategoryTreeNode[];
  depth: number;
  ancestryIds: string[];
  ancestryNames: string[];
}

export interface ItemInspection {
  id: string;
  name: string;
  productType?: string;
  categoryIds: string[];
  categoryNames: string[];
  categoryAncestry: Array<{ categoryId: string; names: string[] }>;
  isDeleted?: boolean;
  variationCount: number;
  variations: Array<{
    id: string;
    name?: string;
    sku?: string;
    priceAmount?: string;
  }>;
  modifierListIdsFromItem: string[];
  modifierListResolution: Array<{
    listId: string;
    resolved: boolean;
    listName?: string;
    modifierOptionIds: string[];
    brokenOptionRefs: string[];
  }>;
  imageIds: string[];
}

export interface CatalogAnalysisReport {
  generatedAt: string;
  environment: string;
  countsByType: Record<string, number>;
  categoryTree: CategoryTreeNode[];
  storeCategorySignals: {
    exactNameMatchCategoryIds: string[];
    note: string;
  };
  items: {
    totalItems: number;
    itemsWithNoCategory: string[];
    itemsWithMultipleCategories: Array<{ id: string; categoryIds: string[] }>;
  };
  modifiers: {
    modifierLists: number;
    modifiers: number;
    orphanModifiers: string[];
    /** MODIFIER_LIST ids referenced on items but missing from catalog snapshot */
    missingModifierListsReferencedByItems: string[];
    /** Items where attached list resolves but an option id is missing */
    itemsWithBrokenModifierOptionRefs: Array<{ itemId: string; listId: string; missingIds: string[] }>;
  };
  inventory?: {
    locationId: string;
    variationsChecked: number;
    inStockPositive: number;
    zeroOrMissing: number;
  };
  /** commerce intent — signals only; not authoritative */
  storefrontClassificationSample: Array<{
    itemId: string;
    name: string;
    inferredDomain: "menu" | "shop" | "ambiguous";
    confidence: "low" | "medium" | "high";
    reasons: string[];
  }>;
}

/** Normalized graph foundation (internal commerce model). */
export interface NormalizedCategoryRef {
  squareId: string;
  name: string;
  parentSquareId: string | null;
  ancestrySquareIds: string[];
}

export interface NormalizedModifierListRef {
  squareId: string;
  name: string;
  selectionType: string;
  minSelected: number;
  maxSelected: number;
  optionModifierIds: string[];
}

export interface NormalizedItemNode {
  squareItemId: string;
  name: string;
  productType?: string;
  categorySquareIds: string[];
  variationSquareIds: string[];
  modifierListSquareIds: string[];
  imageSquareIds: string[];
  storefrontDomain: "menu" | "shop" | "ambiguous";
  storefrontReasons: string[];
}

export interface CommerceGraph {
  version: 1;
  categories: NormalizedCategoryRef[];
  modifierLists: NormalizedModifierListRef[];
  items: NormalizedItemNode[];
}
