/**
 * Demo modifier groups for items when Square doesn't yet provide them.
 * Remove or replace when Square modifier_list_info is integrated.
 */
import type { ModifierGroup } from "@/types/ordering";

const DEMO_GROUPS: Record<string, ModifierGroup[]> = {
  "2-eggs": [
    {
      id: "egg-style",
      name: "Egg Style",
      type: "radio",
      required: true,
      options: [
        { id: "scrambled", name: "Scrambled", price: 0 },
        { id: "sunny", name: "Sunny Side Up", price: 0 },
        { id: "over-easy", name: "Over Easy", price: 0 },
        { id: "over-medium", name: "Over Medium", price: 0 },
        { id: "poached", name: "Poached", price: 0 },
      ],
    },
    {
      id: "side",
      name: "Choose Your Side",
      type: "radio",
      required: true,
      options: [
        { id: "hash-browns", name: "Hash Browns", price: 0 },
        { id: "home-fries", name: "Home Fries", price: 0 },
        { id: "fresh-fruit", name: "Fresh Fruit", price: 1, sublabel: "Seasonal" },
      ],
    },
    {
      id: "addons",
      name: "Add-Ons",
      type: "checkbox",
      required: false,
      maxSel: 4,
      options: [
        { id: "bacon", name: "Bacon", price: 3 },
        { id: "chorizo", name: "Chorizo", price: 3 },
        { id: "avocado", name: "Avocado", price: 2 },
        { id: "extra-cheese", name: "Extra Cheese", price: 1 },
      ],
    },
  ],
  "chorizo": [
    {
      id: "egg-style",
      name: "Egg Style",
      type: "radio",
      required: true,
      options: [
        { id: "scrambled", name: "Scrambled", price: 0 },
        { id: "over-easy", name: "Over Easy", price: 0 },
      ],
    },
    {
      id: "extras",
      name: "Extras",
      type: "checkbox",
      required: false,
      maxSel: 3,
      options: [
        { id: "guac", name: "Add Guacamole", price: 2 },
        { id: "sour-cream", name: "Add Sour Cream", price: 1 },
        { id: "jalapenos", name: "Add Jalapeños", price: 0 },
      ],
    },
  ],
  "burrito": [
    {
      id: "protein",
      name: "Choose Protein",
      type: "radio",
      required: true,
      options: [
        { id: "bacon", name: "Bacon", price: 0 },
        { id: "sausage", name: "Sausage", price: 0 },
        { id: "chorizo", name: "Chorizo", price: 0 },
        { id: "ham", name: "Ham", price: 0 },
        { id: "carne-asada", name: "Carne Asada", price: 2, sublabel: "Popular" },
        { id: "no-meat", name: "No Meat", price: 0 },
      ],
    },
    {
      id: "extras",
      name: "Extras",
      type: "checkbox",
      required: false,
      maxSel: 4,
      options: [
        { id: "guac", name: "Add Guacamole", price: 2 },
        { id: "sour-cream", name: "Add Sour Cream", price: 1 },
        { id: "beans", name: "Add Beans", price: 1 },
        { id: "jalapenos", name: "Add Jalapeños", price: 0 },
      ],
    },
  ],
  "burger": [
    {
      id: "bun",
      name: "Bun Choice",
      type: "radio",
      required: true,
      options: [
        { id: "brioche", name: "Brioche Bun", price: 0 },
        { id: "sesame", name: "Sesame Bun", price: 0 },
        { id: "lettuce", name: "Lettuce Wrap", price: 0 },
      ],
    },
    {
      id: "toppings",
      name: "Extra Toppings",
      type: "checkbox",
      required: false,
      maxSel: 5,
      options: [
        { id: "x-cheese", name: "Extra Cheese", price: 1 },
        { id: "bacon", name: "Add Bacon", price: 3 },
        { id: "avo", name: "Add Avocado", price: 2 },
        { id: "egg", name: "Add Fried Egg", price: 1.5 },
      ],
    },
  ],
  "tacos": [
    {
      id: "protein",
      name: "Choose Protein",
      type: "radio",
      required: true,
      options: [
        { id: "carne-asada", name: "Carne Asada", price: 0 },
        { id: "carnitas", name: "Carnitas", price: 0 },
        { id: "pollo", name: "Pollo Asado", price: 0 },
        { id: "mixed", name: "Mixed (ask us)", price: 0 },
      ],
    },
    {
      id: "salsa",
      name: "Salsa Preference",
      type: "radio",
      required: false,
      options: [
        { id: "roja", name: "Salsa Roja", price: 0 },
        { id: "verde", name: "Salsa Verde", price: 0 },
        { id: "both", name: "Both", price: 0 },
      ],
    },
  ],
};

/** Match item by name (lowercase, normalized) to demo modifier groups */
export function getDemoModifierGroups(item: { id: string; name: string }): ModifierGroup[] | undefined {
  const name = item.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  if (name.includes("egg") && (name.includes("style") || name.includes("any"))) return DEMO_GROUPS["2-eggs"];
  if (name.includes("chorizo") && name.includes("egg")) return DEMO_GROUPS["chorizo"];
  if (name.includes("burrito") || name.includes("classic")) return DEMO_GROUPS["burrito"];
  if (name.includes("burger") || name.includes("house")) return DEMO_GROUPS["burger"];
  if (name.includes("taco") || name.includes("street")) return DEMO_GROUPS["tacos"];
  return undefined;
}
