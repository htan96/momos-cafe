/**
 * Maps Square /api/menu catalog categories into the FIXED print layout.
 * Target `section` strings MUST match `section` in public/print-menu/menu-layout.json
 * (same titles as docs/menu/1.png breakfast, 2.png lunch, 3.png extras).
 *
 * Square category.name is normalized (uppercase); the first matching needle wins.
 * Tune needles to match how categories are named in your Square catalog.
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
   * Square sometimes lists an item under the wrong category. Keys: normalized
   * item name (uppercase, spaces collapsed, ASCII apostrophe). Values: layout
   * `section` string, e.g. "BREAKFAST PLATES". Add rows here for print-only fixes.
   */
  const ITEM_PRINT_SECTION_OVERRIDE_BY_NAME = {
    "JOE'S SPECIAL": "BREAKFAST PLATES",
    "JOES SPECIAL": "BREAKFAST PLATES",
  };

  function normalizeItemNameKey(name) {
    return String(name ?? "")
      .toUpperCase()
      .replace(/\u2019/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * @param {string} itemName
   * @returns {string|null} layout section title or null
   */
  function printSectionOverrideForItemName(itemName) {
    const k = normalizeItemNameKey(itemName);
    return ITEM_PRINT_SECTION_OVERRIDE_BY_NAME[k] || null;
  }

  /**
   * Ordered rules: first matching needle sends the whole Square category to `section`.
   * @typedef {{ section: string; needles: string[] }} PrintSectionRule
   */

  /** @type {{ breakfast: PrintSectionRule[]; lunch: PrintSectionRule[]; extras: PrintSectionRule[] }} */
  const PRINT_SECTION_RULES = {
    breakfast: [
      {
        section: "BREAKFAST BURRITOS",
        needles: ["BREAKFAST BURRITO", "BURRITO"],
      },
      { section: "OMELETS", needles: ["OMELET"] },
      {
        section: "GRIDDLE FAVORITES",
        needles: [
          "GRIDDLE",
          "PANCAKE",
          "WAFFLE",
          "CHICKEN & WAFFLE",
          "FRENCH TOAST",
          "BELGIAN",
          "SHORT STACK",
          "HOT CAKE",
          "CREPE",
          "CRÊPE",
          "BISCUIT",
        ],
      },
      {
        section: "BREAKFAST PLATES",
        needles: [
          "BREAKFAST PLATE",
          "PLATE",
          "CLASSIC",
          "HUEVOS",
          "BENEDICT",
          "CHILAQUILES",
          "RANCHERO",
          "STEAK & EGG",
          "COUNTRY FRIED",
          "TWO EGG",
          "COMBO",
          "SANDWICH",
          "BREAKFAST",
        ],
      },
    ],
    lunch: [
      {
        section: "SALADS",
        needles: [
          "SALAD",
          "LOUIE",
          "COBB",
          "CAESAR",
          "GREEK SALAD",
          "GARDEN SALAD",
        ],
      },
      {
        section: "MEXICAN SPECIALTIES",
        needles: [
          "MEXICAN",
          "FAJITA",
          "QUESADILLA",
          "NACHO",
          "ENCHILADA",
          "CHIMICHANGA",
          "TAMALE",
          "TACO",
          "BURRITO",
          "BURRITO BOWL",
          "WET BURRITO",
        ],
      },
      { section: "BURGERS", needles: ["BURGER", "PATTY MELT", "PATTY"] },
      {
        section: "LUNCH FAVORITES",
        needles: [
          "LUNCH",
          "SANDWICH",
          "SANDWICHES",
          "MELT",
          "CLUB",
          "BLT",
          "WRAP",
          "WRAPS",
          "TURKEY",
          "TUNA",
          "STEAK SANDWICH",
          "CHICKEN",
          "FRIES",
          "FEATURED",
          "SPECIAL",
          "SOUP",
          "CHILI",
        ],
      },
    ],
    extras: [
      { section: "WINGS", needles: ["WING"] },
      { section: "KIDS MEALS", needles: ["KID", "CHILD", "CHILDREN"] },
      {
        section: "BEVERAGES",
        needles: [
          "BEVERAGE",
          "DRINK",
          "DRINKS",
          "SODA",
          "FOUNTAIN",
          "JUICE",
          "COFFEE",
          "TEA",
          "LATTE",
          "CAPPUCCINO",
          "ESPRESSO",
          "SMOOTHIE",
          "SHAKE",
          "MILK",
        ],
      },
      {
        section: "EXTRA SIDES",
        needles: ["SIDE", "SIDES", "EXTRA", "ADD ON", "ADD-ON", "À LA CARTE", "A LA CARTE"],
      },
    ],
  };

  /** When no rule matches category.name */
  const DEFAULT_SECTION = {
    breakfast: "BREAKFAST PLATES",
    lunch: "LUNCH FAVORITES",
    extras: "EXTRA SIDES",
  };

  /**
   * Flat map for debugging / console — order is not significant here.
   * @param {{ breakfast: PrintSectionRule[]; lunch: PrintSectionRule[]; extras: PrintSectionRule[] }} rules
   */
  function flattenPrintSectionRules(rules) {
    /** @type {Record<string, Record<string, string>>} */
    const out = { breakfast: {}, lunch: {}, extras: {} };
    for (const meal of /** @type {const} */ (["breakfast", "lunch", "extras"])) {
      for (const rule of rules[meal]) {
        for (const needle of rule.needles) {
          out[meal][needle] = rule.section;
        }
      }
    }
    return out;
  }

  const SECTION_MAP = flattenPrintSectionRules(PRINT_SECTION_RULES);

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
    const rules = PRINT_SECTION_RULES[mealPage];
    if (!Array.isArray(rules)) return null;
    for (const rule of rules) {
      for (const needle of rule.needles) {
        const n = String(needle).toUpperCase().replace(/\s+/g, " ").trim();
        if (!n) continue;
        if (catNorm.includes(n)) return rule.section;
      }
    }
    return null;
  }

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
    if (
      n.includes("wing") ||
      n.includes("kid") ||
      n.includes("drink") ||
      n.includes("beverage") ||
      n.includes("juice") ||
      n.includes("coffee") ||
      n.includes("soda") ||
      n.includes("tea") ||
      n.includes("side") ||
      n.includes("extra")
    )
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

        const overrideSec = printSectionOverrideForItemName(name);
        let dest = target;
        if (overrideSec && overrideSec.toUpperCase() !== String(sectionName ?? "").toUpperCase()) {
          const alt = findSection(sectionList, overrideSec);
          if (alt && Array.isArray(alt.items)) {
            dest = alt;
            console.log("Print item override:", name, "→", overrideSec, "(Square category:", catName + ")");
          } else {
            console.warn("Print item override: unknown section:", overrideSec, "for item:", name);
          }
        }
        dest.items.push({ name, description: desc, price });
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
    for (const title of ["BREAKFAST BURRITOS", "GRIDDLE FAVORITES"]) {
      const sec = findSection(breakfast, title);
      if (!sec || !Array.isArray(sec.items)) continue;
      for (const it of sec.items) {
        if (!it || typeof it !== "object") continue;
        /** @type {Record<string, unknown>} */ (it).description = "";
      }
    }

    return out;
  }

  global.__PRINT_MENU_SQUARE__ = {
    CATEGORY_ID_TO_MEAL: CATEGORY_ID_TO_MEAL,
    PRINT_SECTION_RULES: PRINT_SECTION_RULES,
    SECTION_MAP: SECTION_MAP,
    DEFAULT_SECTION: DEFAULT_SECTION,
    ITEM_PRINT_SECTION_OVERRIDE_BY_NAME: ITEM_PRINT_SECTION_OVERRIDE_BY_NAME,
    mapMenuApiToPages: mapMenuApiToPages,
  };
})(typeof window !== "undefined" ? window : globalThis);
