import type { ModifierGroup } from "./ordering";

export type CategoryType =
  | "main"
  | "breakfast"
  | "lunch"
  | "drinks"
  | "sides"
  | "featured"
  | "special";

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_active: boolean;
  /** Modifier groups for customization. When present, show Customize instead of Add. */
  modifierGroups?: ModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  menuitems: MenuItem[];
  /** Inferred from name; drives UI behavior (layout, card size, etc.) */
  type?: CategoryType;
}
