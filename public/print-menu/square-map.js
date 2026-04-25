/**
 * Maps Square /api/menu catalog categories into the FIXED print layout (docs/menu).
 * Section assignment uses category.name only (no item.name matching).
 * Structure comes from menu-layout.json — only item rows are filled here.
 */
(function (global) {
  "use strict";

  /**
   * Optional: map Square Catalog CATEGORY id → "breakfast" | "lunch" | "extras".
   * Add real UUIDs from Square when known; otherwise name/type heuristics apply.
   */
  const CATEGORY_ID_TO_MEAL = {
    // "CATEGORY_UUID_HERE": "breakfast",
  };

  /**
   * Square category label (substring match after normalize) → layout `section` string.
   * Keys are tried in literal order; put more specific labels before broader ones
   * (e.g. "Burritos" before "Breakfast" so "Breakfast Burritos" hits burritos).
   * Values must match `section` in menu-layout.json.
   */
  const SECTION_MAP = {
    breakfast: {
      Burrito: "BREAKFAST BURRITOS",
      Burritos: "BREAKFAST BURRITOS",
      Omelet: "OMELETS",
      Omelets: "OMELETS",
      Griddle: "GRIDDLE FAVORITES",
      Pancake: "GRIDDLE FAVORITES",
      Waffle: "GRIDDLE FAVORITES",
      Belgian: "GRIDDLE FAVORITES",
      Stack: "GRIDDLE FAVORITES",
      Crepe: "GRIDDLE FAVORITES",
      "French Toast": "GRIDDLE FAVORITES",
      Benedict: "BREAKFAST PLATES",
      Huevos: "BREAKFAST PLATES",
      Chilaquiles: "BREAKFAST PLATES",
      Biscuit: "GRIDDLE FAVORITES",
      Plate: "BREAKFAST PLATES",
      Breakfast: "BREAKFAST PLATES",
    },
    lunch: {
      Salad: "SALADS",
      Salads: "SALADS",
      Mexican: "MEXICAN SPECIALTIES",
      Fajita: "MEXICAN SPECIALTIES",
      Quesadilla: "MEXICAN SPECIALTIES",
      Burger: "BURGERS",
      Burgers: "BURGERS",
      Lunch: "LUNCH FAVORITES",
      Sandwich: "LUNCH FAVORITES",
    },
    extras: {
      Side: "EXTRA SIDES",
      Sides: "EXTRA SIDES",
      Drink: "EXTRA SIDES",
      Beverage: "EXTRA SIDES",
      Juice: "EXTRA SIDES",
      Coffee: "EXTRA SIDES",
    },
  };

  /** When no SECTION_MAP entry matches category.name */
  const DEFAULT_SECTION = {
    breakfast: "BREAKFAST PLATES",
    lunch: "LUNCH FAVORITES",
    extras: "EXTRA SIDES",
  };

  /**
   * @param {"breakfast"|"lunch"|"extras"} mealPage
   * @param {string} categoryName
   * @returns {string|null} layout section title, or null if unmapped
   */
  function resolveSectionForCategory(mealPage, categoryName) {
    const catNorm = String(categoryName ?? "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!catNorm) return null;
    const map = SECTION_MAP[mealPage];
    if (!map || typeof map !== "object") return null;
    for (const key of Object.keys(map)) {
      const needle = String(key).toUpperCase().replace(/\s+/g, " ").trim();
      if (!needle) continue;
      if (catNorm.includes(needle)) return /** @type {Record<string, string>} */ (map)[key];
    }
    return null;
  }

  /**
   * @param {{ id?: string; name?: string; type?: string }} cat
   * @returns {"breakfast"|"lunch"|"extras"}
   */
  /**
   * Category names that are breakfast food but often lack the word "breakfast"
   * (must stay in sync with inferCategoryType in lib/categoryUtils.ts).
   */
  function categoryNameSuggestsBreakfastMeal(name) {
    const n = String(name ?? "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!n) return false;
    return (
      n.includes("griddle") ||
      n.includes("omelet") ||
      n.includes("pancake") ||
      n.includes("waffle") ||
      n.includes("french toast") ||
      n.includes("short stack") ||
      n.includes("hot cakes") ||
      n.includes("benedict") ||
      n.includes("huevos") ||
      n.includes("chilaquiles") ||
      n.includes("biscuits") ||
      n.includes("crepe") ||
      n.includes("crêpe")
    );
  }

  function mealPageForCategory(cat) {
    if (!cat || typeof cat !== "object") return "lunch";
    const id = String(cat.id ?? "");
    if (CATEGORY_ID_TO_MEAL[id]) return /** @type {"breakfast"|"lunch"|"extras"} */ (CATEGORY_ID_TO_MEAL[id]);
    const t = String(cat.type ?? "").toLowerCase();
    if (t === "breakfast") return "breakfast";
    if (t === "lunch") return "lunch";
    if (t === "drinks" || t === "sides") return "extras";
    const n = String(cat.name ?? "").toLowerCase();
    if (n.includes("breakfast")) return "breakfast";
    if (categoryNameSuggestsBreakfastMeal(cat.name)) return "breakfast";
    if (n.includes("lunch")) return "lunch";
    if (n.includes("drink") || n.includes("beverage") || n.includes("side") || n.includes("extra"))
      return "extras";
    if (t === "featured" || t === "special") return "lunch";
    return "lunch";
  }

  /**
   * @param {unknown} v
   * @returns {Record<string, unknown>[]}
   */
  function asSectionArray(v) {
    return Array.isArray(v) ? v : [];
  }

  /**
   * @param {Record<string, unknown>} sec
   */
  function clearInjectAndItems(sec) {
    delete sec.inject;
    delete sec.injectItemDefaults;
    if (!Array.isArray(sec.items)) sec.items = [];
    else sec.items.length = 0;
  }

  /**
   * @param {Record<string, unknown>} sec
   */
  function clearIfInjectSection(sec) {
    if (!sec || typeof sec !== "object") return;
    if ("inject" in /** @type {Record<string, unknown>} */ (sec)) clearInjectAndItems(sec);
  }

  /**
   * @param {unknown} layoutRoot
   * @returns {{ pages: unknown }}
   */
  function cloneLayout(layoutRoot) {
    return JSON.parse(JSON.stringify(layoutRoot));
  }

  /**
   * @param {Record<string, unknown>} section
   * @param {string} title
   * @returns {boolean}
   */
  function sectionIs(section, title) {
    return String(section.section ?? "").toUpperCase() === String(title).toUpperCase();
  }

  /**
   * @param {Record<string, unknown>[]} sections
   * @param {string} sectionTitle
   * @returns {Record<string, unknown>|null}
   */
  function findSection(sections, sectionTitle) {
    for (const s of sections) {
      if (s && typeof s === "object" && sectionIs(/** @type {Record<string, unknown>} */ (s), sectionTitle))
        return /** @type {Record<string, unknown>} */ (s);
    }
    return null;
  }

  /**
   * @param {unknown[]} categories — GET /api/menu response
   * @param {unknown} layoutRoot — parsed menu-layout.json
   * @returns {{ pages: unknown }}
   */
  function mapMenuApiToPages(categories, layoutRoot) {
    const out = cloneLayout(layoutRoot);
    const pages = out.pages && typeof out.pages === "object" ? out.pages : {};

    const breakfast = asSectionArray(pages.breakfast);
    const lunch = asSectionArray(pages.lunch);
    const extras = pages.extras && typeof pages.extras === "object" ? pages.extras : {};
    const extraSections = asSectionArray(extras.sections);

    for (const s of breakfast) {
      clearIfInjectSection(/** @type {Record<string, unknown>} */ (s));
    }
    for (const s of lunch) {
      clearIfInjectSection(/** @type {Record<string, unknown>} */ (s));
    }
    for (const s of extraSections) {
      clearIfInjectSection(/** @type {Record<string, unknown>} */ (s));
    }

    if (!Array.isArray(categories)) return out;

    for (const cat of categories) {
      if (!cat || typeof cat !== "object") continue;
      const c = /** @type {{ id?: string; name?: string; type?: string; menuitems?: unknown[] }} */ (cat);
      const meal = mealPageForCategory(c);
      const catName = String(c.name ?? "");

      let sectionName = resolveSectionForCategory(meal, catName);
      const defaultSec = DEFAULT_SECTION[meal];
      if (!sectionName) {
        console.warn("Unmapped category:", catName);
        sectionName = defaultSec;
      }

      console.log("Category → Section mapping:", catName, sectionName);

      const sectionList =
        meal === "breakfast" ? breakfast : meal === "lunch" ? lunch : extraSections;
      let target = findSection(sectionList, sectionName);
      if (!target || !Array.isArray(target.items)) {
        console.warn("Section not found in layout:", sectionName, "category:", catName);
        const fallback = findSection(sectionList, defaultSec);
        if (!fallback || !Array.isArray(fallback.items)) continue;
        target = fallback;
      }

      const items = Array.isArray(c.menuitems) ? c.menuitems : [];
      for (const raw of items) {
        if (!raw || typeof raw !== "object") continue;
        const mi = /** @type {Record<string, unknown>} */ (raw);
        const name = String(mi.name ?? "");
        const desc = mi.description != null ? String(mi.description) : "";
        const priceRaw = mi.price;
        const price =
          priceRaw !== null && priceRaw !== undefined && !Number.isNaN(Number(priceRaw))
            ? Number(priceRaw)
            : null;
        target.items.push({ name, description: desc, price });
      }
    }

    const saladSec = findSection(lunch, "SALADS");
    if (saladSec && Array.isArray(saladSec.items)) {
      for (const it of saladSec.items) {
        if (it && typeof it === "object") /** @type {Record<string, unknown>} */ (it).price = null;
      }
    }
    const mexSec = findSection(lunch, "MEXICAN SPECIALTIES");
    if (mexSec && Array.isArray(mexSec.items)) {
      for (const it of mexSec.items) {
        if (!it || typeof it !== "object") continue;
        const o = /** @type {Record<string, unknown>} */ (it);
        o.note = "STEAK CHICKEN SHRIMP +$2";
        o.description = "";
      }
    }

    return out;
  }

  global.__PRINT_MENU_SQUARE__ = {
    CATEGORY_ID_TO_MEAL: CATEGORY_ID_TO_MEAL,
    SECTION_MAP: SECTION_MAP,
    DEFAULT_SECTION: DEFAULT_SECTION,
    mapMenuApiToPages: mapMenuApiToPages,
  };
})(typeof window !== "undefined" ? window : globalThis);
