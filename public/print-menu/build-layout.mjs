import fs from "fs";
const path = new URL("./menu-data.json", import.meta.url);
const layoutPath = new URL("./menu-layout.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(path, "utf8"));

const injectBySection = {
  "BREAKFAST PLATES": { category: "breakfast", maxItems: 12 },
  "GRIDDLE FAVORITES": { category: "breakfast", maxItems: 14 },
  OMELETS: { category: "breakfast", maxItems: 8 },
  "LUNCH FAVORITES": { category: "lunch", maxItems: 12 },
  BURGERS: { category: "lunch", maxItems: 8 },
  SALADS: { category: "lunch", maxItems: 6, itemDefaults: { price: null } },
  "MEXICAN SPECIALTIES": {
    category: "lunch",
    maxItems: 8,
    itemDefaults: { note: "STEAK CHICKEN SHRIMP +$2", description: "" },
  },
  "EXTRA SIDES": { category: "extras", maxItems: 20 },
};

function stripItems(sec) {
  const inj = injectBySection[sec.section];
  if (!inj) return sec;
  const { itemDefaults, ...inject } = inj;
  const out = { ...sec, items: [], inject };
  if (itemDefaults) out.injectItemDefaults = itemDefaults;
  return out;
}

data.pages.breakfast = data.pages.breakfast.map(stripItems);
data.pages.lunch = data.pages.lunch.map(stripItems);
data.pages.extras.sections = data.pages.extras.sections.map(stripItems);

fs.writeFileSync(layoutPath, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Wrote menu-layout.json");
