/**
 * Maps Square /api/menu catalog categories into the FIXED print layout (docs/menu).
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
   * Section order = match priority (first win). Section `section` must match menu-layout.json.
   * Breakfast page — /docs/menu/1.png
   */
  const BREAKFAST_SECTION_RULES = [
    {
      section: "BREAKFAST BURRITOS",
      test: function (n) {
        return /\bburrito\b/i.test(n);
      },
    },
    {
      section: "OMELETS",
      test: function (n) {
        return /omelet/i.test(n);
      },
    },
    {
      section: "GRIDDLE FAVORITES",
      test: function (n) {
        return /(french toast|pancake|waffle|short stack|biscuit|griddle)/i.test(n);
      },
    },
    {
      section: "BREAKFAST PLATES",
      test: function () {
        return true;
      },
    },
  ];

  /** Lunch page — /docs/menu/2.png */
  const LUNCH_SECTION_RULES = [
    {
      section: "SALADS",
      test: function (n) {
        return /(salad|louie|cobb)/i.test(n);
      },
    },
    {
      section: "MEXICAN SPECIALTIES",
      test: function (n) {
        return /(fajita|quesadilla|nacho|burrito|enchilada|tamale)/i.test(n);
      },
    },
    {
      section: "BURGERS",
      test: function (n) {
        return /(burger|patty melt)/i.test(n);
      },
    },
    {
      section: "LUNCH FAVORITES",
      test: function () {
        return true;
      },
    },
  ];

  /** Extras page — inject only EXTRA SIDES; wings/kids/beverages stay layout-static */
  const EXTRAS_SECTION_RULES = [
    {
      section: "EXTRA SIDES",
      test: function () {
        return true;
      },
    },
  ];

  /**
   * @param {{ id?: string; name?: string; type?: string }} cat
   * @returns {"breakfast"|"lunch"|"extras"}
   */
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
   * Only reset sections that were inject targets; keep static blocks (e.g. Kids, Wings).
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
   * @param {Record<string, unknown>} row
   * @param {Array<{ section: string; test: (n: string) => boolean }>} rules
   * @param {Record<string, unknown>[]} sections
   */
  function pushItemToFirstMatch(row, rules, sections) {
    const name = String(row.name ?? "");
    for (const rule of rules) {
      if (!rule.test(name)) continue;
      const sec = findSection(sections, rule.section);
      if (!sec || !Array.isArray(sec.items)) continue;
      sec.items.push(row);
      return;
    }
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
      const meal = mealPageForCategory(/** @type {{ id?: string; name?: string; type?: string }} */ (cat));
      const items = Array.isArray(/** @type {{ menuitems?: unknown }} */ (cat).menuitems)
        ? /** @type {{ menuitems: unknown[] }} */ (cat).menuitems
        : [];

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
        /** @type {Record<string, unknown>} */
        const row = { name, description: desc, price };

        if (meal === "breakfast") {
          pushItemToFirstMatch(row, BREAKFAST_SECTION_RULES, breakfast);
        } else if (meal === "lunch") {
          pushItemToFirstMatch(row, LUNCH_SECTION_RULES, lunch);
        } else {
          pushItemToFirstMatch(row, EXTRAS_SECTION_RULES, extraSections);
        }
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
    mapMenuApiToPages: mapMenuApiToPages,
  };
})(typeof window !== "undefined" ? window : globalThis);
