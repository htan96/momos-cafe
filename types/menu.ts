export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_active: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  menuitems: MenuItem[];
}
