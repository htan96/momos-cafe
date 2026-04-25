/**
 * Print menu — fixed layout from menu-layout.json; name + price from menu-simple.json
 * (or Square-shaped data via squareItemsToSimpleMenu). Legacy: ?legacy=1 uses menu-data.json.
 */

console.log("MENU JS LOADED");

(function () {
  "use strict";

  /** Same origin as index.html: `/public/print-menu/` → `/print-menu/` */
  const printMenuStaticBase = new URL("/print-menu/", window.location.origin).href;
  let layoutJsonHref = new URL("menu-layout.json", printMenuStaticBase).href;
  let simpleJsonHref = new URL("menu-simple.json", printMenuStaticBase).href;
  let legacyJsonHref = new URL("menu-data.json", printMenuStaticBase).href;

  /** Demo Square-shaped rows — category maps to breakfast | lunch | extras buckets. */
  const SQUARE_DEMO_ITEMS = [
    { name: "Two Eggs", price: 15, category: "Breakfast" },
    { name: "Burger", price: 18, category: "Lunch" },
    { name: "Side Toast", price: 3, category: "Extras" },
  ];

  /**
   * @param {Array<{ name?: string; price?: number; category?: string }>} squareItems
   * @returns {{ breakfast: {name: string, price: number}[]; lunch: {name: string, price: number}[]; extras: {name: string, price: number}[] }}
   */
  function squareItemsToSimpleMenu(squareItems) {
    /** @type {{ breakfast: {name: string, price: number}[]; lunch: {name: string, price: number}[]; extras: {name: string, price: number}[] }} */
    const out = { breakfast: [], lunch: [], extras: [] };
    if (!Array.isArray(squareItems)) return out;
    for (const it of squareItems) {
      if (!it || typeof it !== "object") continue;
      const row = {
        name: String(it.name ?? ""),
        price: Number(it.price),
      };
      if (!Number.isFinite(row.price)) continue;
      const c = String(it.category ?? "").toLowerCase();
      if (c.includes("breakfast")) out.breakfast.push(row);
      else if (c.includes("lunch")) out.lunch.push(row);
      else if (c.includes("extra")) out.extras.push(row);
      else out.lunch.push(row);
    }
    return out;
  }

  /**
   * @param {unknown} layoutRoot — { pages: { breakfast, lunch, extras } }
   * @param {unknown} simple — { breakfast: [], lunch: [], extras: [] }
   * @returns {{ pages: unknown }}
   */
  function mergeLayoutWithSimple(layoutRoot, simple) {
    const out = JSON.parse(JSON.stringify(layoutRoot));
    const cur = { breakfast: 0, lunch: 0, extras: 0 };
    /** @param {string} cat */
    const arrFor = (cat) => {
      if (!simple || typeof simple !== "object") return [];
      const a = /** @type {Record<string, unknown>} */ (simple)[cat];
      return Array.isArray(a) ? a : [];
    };

    /**
     * @param {Record<string, unknown>} sec
     */
    function applySection(sec) {
      const inj = sec.inject;
      if (!inj || typeof inj !== "object") return;
      const cat = String(/** @type {{ category?: string }} */ (inj).category ?? "");
      if (!cat) return;
      const maxRaw = /** @type {{ maxItems?: number }} */ (inj).maxItems;
      const max = maxRaw != null ? Number(maxRaw) : 9999;
      const arr = arrFor(cat);
      const start = cur[/** @type {"breakfast"|"lunch"|"extras"} */ (cat)];
      const end = Math.min(start + (Number.isFinite(max) ? max : 9999), arr.length);
      const slice = arr.slice(start, end);
      cur[/** @type {"breakfast"|"lunch"|"extras"} */ (cat)] = end;

      const defaults =
        sec.injectItemDefaults && typeof sec.injectItemDefaults === "object"
          ? /** @type {Record<string, unknown>} */ (sec.injectItemDefaults)
          : {};

      sec.items = slice.map((raw) => {
        const x = raw && typeof raw === "object" ? raw : {};
        const priceRaw = /** @type {{ price?: unknown }} */ (x).price;
        const price =
          priceRaw !== undefined && priceRaw !== null && !Number.isNaN(Number(priceRaw))
            ? Number(priceRaw)
            : null;
        /** @type {Record<string, unknown>} */
        const row = {
          name: String(/** @type {{ name?: string }} */ (x).name ?? ""),
          description:
            /** @type {{ description?: string }} */ (x).description != null
              ? String(/** @type {{ description?: string }} */ (x).description)
              : "",
          price,
        };
        if (Array.isArray(/** @type {{ lines?: unknown }} */ (x).lines))
          row.lines = /** @type {{ lines?: unknown }} */ (x).lines;
        if (/** @type {{ note?: string }} */ (x).note != null)
          row.note = String(/** @type {{ note?: string }} */ (x).note);
        Object.assign(row, defaults);
        return row;
      });

      delete sec.inject;
      delete sec.injectItemDefaults;
    }

    const pages = out.pages && typeof out.pages === "object" ? out.pages : {};
    for (const sec of Array.isArray(pages.breakfast) ? pages.breakfast : []) {
      if (sec && typeof sec === "object") applySection(/** @type {Record<string, unknown>} */ (sec));
    }
    for (const sec of Array.isArray(pages.lunch) ? pages.lunch : []) {
      if (sec && typeof sec === "object") applySection(/** @type {Record<string, unknown>} */ (sec));
    }
    const ex = pages.extras && typeof pages.extras === "object" ? pages.extras : {};
    const sections = Array.isArray(ex.sections) ? ex.sections : [];
    for (const sec of sections) {
      if (sec && typeof sec === "object") applySection(/** @type {Record<string, unknown>} */ (sec));
    }

    return out;
  }

  /**
   * @param {HTMLElement} root
   */
  function applyDensity(root) {
    root.querySelectorAll(".menu-page").forEach((page) => {
      const n = page.querySelectorAll(".menu-item").length;
      /* Tighten spacing first; print CSS keeps type readable (does not shrink past ~9.75pt) */
      page.classList.toggle("menu-page--dense", n > 18);
      page.classList.toggle("menu-page--extra-dense", n > 28);
    });
  }

  /**
   * @param {string} s
   * @returns {string}
   */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * @param {number|null|undefined} n
   * @returns {string}
   */
  function formatPrice(n) {
    if (n === null || n === undefined) return "";
    const num = Number(n);
    if (Number.isNaN(num)) return "";
    return "$" + Math.round(num);
  }

  /**
   * @param {Record<string, unknown>} item
   * @param {number|null|undefined} [fallbackSectionPrice]
   * @returns {HTMLElement}
   */
  function renderMenuItem(item, fallbackSectionPrice) {
    const wrap = document.createElement("div");
    wrap.className = "menu-item";

    const priceVal =
      item.price !== null && item.price !== undefined
        ? item.price
        : fallbackSectionPrice;
    const showPrice =
      priceVal !== null && priceVal !== undefined && !Number.isNaN(Number(priceVal));

    const row = document.createElement("div");
    row.className = "menu-item__row";
    if (showPrice) {
      row.innerHTML =
        '<span class="menu-item__name">' +
        escapeHtml(String(item.name ?? "")) +
        '</span><span class="menu-item__leader" aria-hidden="true"></span><span class="menu-item__price">' +
        escapeHtml(formatPrice(/** @type {number} */ (priceVal))) +
        "</span>";
    } else {
      row.innerHTML =
        '<span class="menu-item__name">' +
        escapeHtml(String(item.name ?? "")) +
        "</span>";
    }
    wrap.appendChild(row);

    const desc = item.description != null ? String(item.description).trim() : "";
    if (desc) {
      const d = document.createElement("p");
      d.className = "menu-item__desc";
      d.textContent = desc;
      wrap.appendChild(d);
    }

    const note = item.note != null ? String(item.note).trim() : "";
    if (note) {
      const n = document.createElement("p");
      n.className = "menu-item__note";
      n.textContent = note;
      wrap.appendChild(n);
    }

    const lines = Array.isArray(item.lines) ? item.lines : [];
    for (const line of lines) {
      if (!line || typeof line !== "object") continue;
      const er = document.createElement("div");
      er.className = "menu-item__extra-row";
      er.innerHTML =
        '<span class="menu-item__extra-text">' +
        escapeHtml(String(line.text ?? "")) +
        '</span><span class="menu-item__leader" aria-hidden="true"></span><span class="menu-item__extra-price">' +
        escapeHtml(formatPrice(/** @type {number} */ (line.price))) +
        "</span>";
      wrap.appendChild(er);
    }

    return wrap;
  }

  /**
   * @param {Record<string, unknown>} section
   * @returns {HTMLElement}
   */
  function renderSection(section) {
    const sec = document.createElement("section");
    sec.className = "menu-section";

    const head = document.createElement("div");
    head.className = "section-head";
    const title = document.createElement("h2");
    title.className = "section-head__title";
    title.textContent = String(section.section ?? "").toUpperCase();
    head.appendChild(title);
    if (section.sectionPrice != null && section.sectionPrice !== "") {
      const sp = document.createElement("span");
      sp.className = "section-head__price";
      sp.textContent = formatPrice(/** @type {number} */ (section.sectionPrice));
      head.appendChild(sp);
    }
    sec.appendChild(head);

    const sub = section.subtitle != null ? String(section.subtitle).trim() : "";
    if (sub) {
      const p = document.createElement("p");
      p.className = "section-subtitle";
      p.textContent = sub.toUpperCase();
      sec.appendChild(p);
    }

    const layout = section.layout;
    const additionsBox = section.additionsBox;

    const bodyHost = document.createElement("div");
    if (additionsBox && typeof additionsBox === "object") {
      bodyHost.className = "section-with-additions";
      const main = document.createElement("div");
      main.className = "section-main";
      fillSectionBody(main, section, layout);
      bodyHost.appendChild(main);

      const aside = document.createElement("aside");
      aside.className = "additions-box";
      const at = document.createElement("p");
      at.className = "additions-box__title";
      at.textContent = String(
        /** @type {{ title?: string }} */ (additionsBox).title ?? "ADDITIONS"
      ).toUpperCase();
      aside.appendChild(at);
      const addSub = String(
        /** @type {{ subtitle?: string }} */ (additionsBox).subtitle ?? ""
      ).trim();
      if (addSub) {
        const sub = document.createElement("p");
        sub.className = "additions-box__subtitle";
        sub.textContent = addSub.toUpperCase();
        aside.appendChild(sub);
      }
      const rows = Array.isArray(
        /** @type {{ rows?: unknown[] }} */ (additionsBox).rows
      )
        ? /** @type {{ rows: { label?: string; price?: number }[] }} */ (additionsBox).rows
        : [];
      for (const r of rows) {
        const row = document.createElement("div");
        row.className = "additions-box__row";
        const px = formatPrice(/** @type {number} */ (r.price));
        const plus = px.startsWith("$") ? "+" + px : "+" + px;
        row.innerHTML =
          '<span>' +
          escapeHtml(String(r.label ?? "")) +
          "</span><span>" +
          escapeHtml(plus) +
          "</span>";
        aside.appendChild(row);
      }
      bodyHost.appendChild(aside);
      sec.appendChild(bodyHost);
    } else {
      fillSectionBody(bodyHost, section, layout);
      sec.appendChild(bodyHost);
    }

    const footer = section.footer != null ? String(section.footer).trim() : "";
    if (footer) {
      const f = document.createElement("p");
      f.className = "section-footer";
      f.textContent = footer.toUpperCase();
      sec.appendChild(f);
    }

    return sec;
  }

  /**
   * @param {HTMLElement} host
   * @param {Record<string, unknown>} section
   * @param {string|undefined} layout
   */
  function fillSectionBody(host, section, layout) {
    if (layout === "two-col-flavors") {
      const grid = document.createElement("div");
      grid.className = "flavors-grid";
      const left = document.createElement("div");
      left.className = "flavors-grid__col";
      const right = document.createElement("div");
      right.className = "flavors-grid__col";
      const fl = Array.isArray(section.flavorsLeft) ? section.flavorsLeft : [];
      const fr = Array.isArray(section.flavorsRight) ? section.flavorsRight : [];
      for (const t of fl) {
        const el = document.createElement("div");
        el.className = "flavors-grid__item";
        el.textContent = String(t).toUpperCase();
        left.appendChild(el);
      }
      for (const t of fr) {
        const el = document.createElement("div");
        el.className = "flavors-grid__item";
        el.textContent = String(t).toUpperCase();
        right.appendChild(el);
      }
      grid.appendChild(left);
      grid.appendChild(right);
      host.appendChild(grid);
      return;
    }

    const subsections = Array.isArray(section.subsections)
      ? section.subsections
      : [];
    if (subsections.length > 0) {
      for (const sub of subsections) {
        if (!sub || typeof sub !== "object") continue;
        const wrap = document.createElement("div");
        wrap.className = "bev-sub";
        const lab = document.createElement("div");
        lab.className = "bev-sub__label";
        lab.textContent = String(
          /** @type {{ label?: string }} */ (sub).label ?? ""
        ).toUpperCase();
        const tx = document.createElement("div");
        tx.className = "bev-sub__text";
        tx.textContent = String(
          /** @type {{ items?: string }} */ (sub).items ?? ""
        ).toUpperCase();
        wrap.appendChild(lab);
        wrap.appendChild(tx);
        host.appendChild(wrap);
      }
      return;
    }

    const items = Array.isArray(section.items) ? section.items : [];
    const sectionPrice =
      section.sectionPrice != null ? Number(section.sectionPrice) : undefined;

    if (layout === "two-col-items" && items.length > 0) {
      const mid = Math.ceil(items.length / 2);
      const grid = document.createElement("div");
      grid.className = "section-layout-two-col";
      const col1 = document.createElement("div");
      const col2 = document.createElement("div");
      items.forEach((it, i) => {
        const col = i < mid ? col1 : col2;
        col.appendChild(
          renderMenuItem(
            /** @type {Record<string, unknown>} */ (it),
            Number.isFinite(sectionPrice) ? sectionPrice : undefined
          )
        );
      });
      grid.appendChild(col1);
      grid.appendChild(col2);
      host.appendChild(grid);
      return;
    }

    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      host.appendChild(
        renderMenuItem(
          /** @type {Record<string, unknown>} */ (it),
          Number.isFinite(sectionPrice) ? sectionPrice : undefined
        )
      );
    }
  }

  /**
   * @param {unknown[]} sections
   * @param {"left"|"right"} col
   * @returns {HTMLElement}
   */
  function renderColumn(sections, col) {
    const wrap = document.createElement("div");
    wrap.className = "menu-page__col";
    for (const raw of sections) {
      if (!raw || typeof raw !== "object") continue;
      const s = /** @type {Record<string, unknown>} */ (raw);
      if (String(s.column ?? "left") !== col) continue;
      wrap.appendChild(renderSection(s));
    }
    return wrap;
  }

  /**
   * @param {unknown[]} breakfastSections
   * @returns {HTMLElement}
   */
  function renderBreakfastPage(breakfastSections) {
    const page = document.createElement("div");
    page.className = "menu-page menu-page--breakfast";

    const header = document.createElement("header");
    header.className = "menu-page__header";
    header.innerHTML = "<h1>Breakfast</h1>";
    page.appendChild(header);

    const body = document.createElement("div");
    body.className = "menu-page__body";
    body.appendChild(renderColumn(breakfastSections, "left"));
    const div = document.createElement("div");
    div.className = "menu-page__divider";
    div.setAttribute("aria-hidden", "true");
    body.appendChild(div);
    body.appendChild(renderColumn(breakfastSections, "right"));
    page.appendChild(body);

    const footer = document.createElement("footer");
    footer.className = "menu-page__footer";
    page.appendChild(footer);

    return page;
  }

  /**
   * @param {unknown[]} lunchSections
   * @returns {HTMLElement}
   */
  function renderLunchPage(lunchSections) {
    const page = document.createElement("div");
    page.className = "menu-page menu-page--lunch";

    const header = document.createElement("header");
    header.className = "menu-page__header";
    header.innerHTML = "<h1>Lunch</h1>";
    page.appendChild(header);

    const body = document.createElement("div");
    body.className = "menu-page__body";
    body.appendChild(renderColumn(lunchSections, "left"));
    const div = document.createElement("div");
    div.className = "menu-page__divider";
    div.setAttribute("aria-hidden", "true");
    body.appendChild(div);
    body.appendChild(renderColumn(lunchSections, "right"));
    page.appendChild(body);

    const footer = document.createElement("footer");
    footer.className = "menu-page__footer";
    page.appendChild(footer);

    return page;
  }

  /**
   * @param {Record<string, unknown>} extras
   * @returns {HTMLElement}
   */
  function renderExtrasPage(extras) {
    const headers = Array.isArray(extras.headers) ? extras.headers : [];
    const hLeft = headers[0] != null ? String(headers[0]) : "THE LATEST & MORE";
    const hRight =
      headers[1] != null ? String(headers[1]) : "BREAKFAST & LUNCH CLASSICS";

    const page = document.createElement("div");
    page.className = "menu-page menu-page--extras";

    const header = document.createElement("header");
    header.className = "menu-page__header menu-page__header--split";
    header.innerHTML =
      "<h1>" +
      escapeHtml(hLeft.toUpperCase()) +
      "</h1><h1>" +
      escapeHtml(hRight.toUpperCase()) +
      "</h1>";
    page.appendChild(header);

    const body = document.createElement("div");
    body.className = "menu-page__body";

    const left = document.createElement("div");
    left.className = "menu-page__col";
    const sections = Array.isArray(extras.sections) ? extras.sections : [];
    for (const raw of sections) {
      if (!raw || typeof raw !== "object") continue;
      left.appendChild(renderSection(/** @type {Record<string, unknown>} */ (raw)));
    }

    const div = document.createElement("div");
    div.className = "menu-page__divider";
    div.setAttribute("aria-hidden", "true");
    body.appendChild(left);
    body.appendChild(div);

    const brandCol = document.createElement("div");
    brandCol.className = "menu-page__col menu-page__col--branding";

    const branding =
      extras.branding && typeof extras.branding === "object"
        ? /** @type {Record<string, string>} */ (extras.branding)
        : {};

    const logoSrc = branding.logoSrc || "/images/logo.png";
    const img = document.createElement("img");
    img.className = "branding-logo";
    img.src = logoSrc;
    img.alt = "Momo's Café";
    brandCol.appendChild(img);

    const lines = [
      branding.address,
      branding.phone,
      branding.hours,
      branding.website,
    ].filter(Boolean);
    for (const line of lines) {
      const p = document.createElement("div");
      p.className = "branding-line";
      p.textContent = String(line).toUpperCase();
      brandCol.appendChild(p);
    }

    if (branding.social) {
      const soc = document.createElement("div");
      soc.className = "branding-social";
      soc.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' +
        "<span>" +
        escapeHtml(String(branding.social).toUpperCase()) +
        "</span>";
      brandCol.appendChild(soc);
    }

    const bannerText =
      extras.cateringBanner != null
        ? String(extras.cateringBanner)
        : "CATERING AVAILABLE!!!";
    const ban = document.createElement("div");
    ban.className = "catering-banner";
    ban.textContent = bannerText.toUpperCase();
    brandCol.appendChild(ban);

    body.appendChild(brandCol);
    page.appendChild(body);

    return page;
  }

  /**
   * @param {unknown} data
   * @returns {boolean}
   */
  function isSimpleMenuShape(data) {
    if (!data || typeof data !== "object") return false;
    const o = /** @type {Record<string, unknown>} */ (data);
    if ("pages" in o) return false;
    return (
      Array.isArray(o.breakfast) ||
      Array.isArray(o.lunch) ||
      Array.isArray(o.extras)
    );
  }

  /**
   * Section-based layout: `pages.breakfast`, `pages.lunch`, `pages.extras`.
   * @param {unknown} pages
   * @param {HTMLElement} root
   */
  function renderFullStructuredMenu(pages, root) {
    root.replaceChildren();
    const p =
      pages && typeof pages === "object"
        ? /** @type {Record<string, unknown>} */ (pages)
        : {};

    const breakfast = Array.isArray(p.breakfast) ? p.breakfast : [];
    const lunch = Array.isArray(p.lunch) ? p.lunch : [];
    const extras =
      p.extras && typeof p.extras === "object"
        ? /** @type {Record<string, unknown>} */ (p.extras)
        : {};

    root.appendChild(renderBreakfastPage(breakfast));
    root.appendChild(renderLunchPage(lunch));
    root.appendChild(renderExtrasPage(extras));
  }

  /**
   * Root `{ breakfast: [], lunch: [], extras: [] }` — merge into fixed layout then render.
   * @param {unknown} data
   * @param {HTMLElement} root
   */
  async function renderSimpleMenu(data, root) {
    const lr = await fetch(layoutJsonHref, { cache: "no-store" });
    if (!lr.ok) throw new Error("Failed to load menu-layout.json (" + lr.status + ")");
    const layout = await lr.json();
    const merged = mergeLayoutWithSimple(layout, data);
    console.log("Merged layout + simple → pages:", merged && merged.pages);
    if (!merged || typeof merged !== "object" || !merged.pages) {
      throw new Error("mergeLayoutWithSimple did not produce { pages }");
    }
    renderFullStructuredMenu(merged.pages, root);
  }

  /**
   * Dispatch: full `data.pages` OR simple root buckets.
   * @param {unknown} data
   * @param {HTMLElement} root
   */
  async function renderMenuFromData(data, root) {
    console.log("Loaded menu data:", data);
    if (!data || typeof data !== "object") {
      root.replaceChildren();
      root.innerHTML =
        '<p class="menu-error" style="padding:1rem;color:#c00;">Invalid menu data.</p>';
      return;
    }
    const d = /** @type {Record<string, unknown>} */ (data);
    if (d.pages && typeof d.pages === "object") {
      renderFullStructuredMenu(d.pages, root);
      applyDensity(root);
      return;
    }
    if (isSimpleMenuShape(data)) {
      await renderSimpleMenu(data, root);
      applyDensity(root);
      return;
    }
    root.replaceChildren();
    root.innerHTML =
      '<p class="menu-error" style="padding:1rem;color:#c00;">Unrecognized menu JSON. Use <code>{ pages: { breakfast, lunch, extras } }</code> or <code>{ breakfast, lunch, extras }</code>.</p>';
  }

  /**
   * @param {HTMLElement} root
   */
  async function loadDefaultMenus(root) {
    const params = new URLSearchParams(window.location.search);
    if (params.get("legacy") === "1") {
      const res = await fetch(legacyJsonHref, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load menu-data.json");
      const data = await res.json();
      await renderMenuFromData(data, root);
      return;
    }

    if (params.get("source") === "square") {
      const simple = squareItemsToSimpleMenu(SQUARE_DEMO_ITEMS);
      const lr = await fetch(layoutJsonHref, { cache: "no-store" });
      if (!lr.ok) throw new Error("Failed to load menu-layout.json");
      const layout = await lr.json();
      const merged = mergeLayoutWithSimple(layout, simple);
      await renderMenuFromData(merged, root);
      return;
    }

    if (params.get("source") === "simple") {
      const sr = await fetch(simpleJsonHref, { cache: "no-store" });
      if (!sr.ok) throw new Error("Failed to load menu-simple.json");
      const simple = await sr.json();
      const lr = await fetch(layoutJsonHref, { cache: "no-store" });
      if (!lr.ok) throw new Error("Failed to load menu-layout.json");
      const layout = await lr.json();
      const merged = mergeLayoutWithSimple(layout, simple);
      await renderMenuFromData(merged, root);
      return;
    }

    const apiUrl = new URL("/api/menu", window.location.origin).href;
    const apiRes = await fetch(apiUrl, { cache: "no-store" });
    if (!apiRes.ok) {
      console.warn("Print menu: /api/menu failed, using menu-simple.json fallback", apiRes.status);
      const sr = await fetch(simpleJsonHref, { cache: "no-store" });
      if (!sr.ok) throw new Error("Fallback menu-simple.json failed");
      const simple = await sr.json();
      const lr = await fetch(layoutJsonHref, { cache: "no-store" });
      if (!lr.ok) throw new Error("Failed to load menu-layout.json");
      const layout = await lr.json();
      const merged = mergeLayoutWithSimple(layout, simple);
      await renderMenuFromData(merged, root);
      return;
    }

    const squareRaw = await apiRes.json();
    console.log("Square Raw Data:", squareRaw);

    const mapper = window.__PRINT_MENU_SQUARE__;
    if (!mapper || typeof mapper.mapMenuApiToPages !== "function") {
      throw new Error("square-map.js must load before menu.js");
    }

    const lr = await fetch(layoutJsonHref, { cache: "no-store" });
    if (!lr.ok) throw new Error("Failed to load menu-layout.json");
    const layout = await lr.json();
    const mapped = mapper.mapMenuApiToPages(squareRaw, layout);
    console.log("Mapped Menu Data:", mapped);
    await renderMenuFromData(mapped, root);
  }

  /**
   * @param {unknown} parsed
   * @param {HTMLElement} root
   */
  async function applyLoadedJson(parsed, root) {
    await renderMenuFromData(parsed, root);
  }

  function init() {
    const root = document.getElementById("menu-root");
    const btnPrint = document.getElementById("btn-print");
    const btnReset = document.getElementById("btn-reset");
    const inputJson = document.getElementById("input-json");

    if (!root || !btnPrint || !btnReset || !inputJson) return;

    loadDefaultMenus(root).catch((err) => {
      console.error(err);
      root.innerHTML =
        '<p style="padding:1rem;color:#c00;">Could not load print menu. Use HTTP(S). Default loads <code>/api/menu</code> + layout; fallback needs <code>menu-simple.json</code>. Try <code>?source=simple</code>, <code>?source=square</code>, or <code>?legacy=1</code>.</p>';
    });

    btnPrint.addEventListener("click", () => {
      window.print();
    });

    btnReset.addEventListener("click", () => {
      loadDefaultMenus(root).catch(console.error);
      /** @type {HTMLInputElement} */ (inputJson).value = "";
    });

    inputJson.addEventListener("change", () => {
      const file = /** @type {HTMLInputElement} */ (inputJson).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          applyLoadedJson(data, root).catch((e) => {
            console.error(e);
            alert("Invalid JSON or merge failed.");
          });
        } catch (e) {
          console.error(e);
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file, "UTF-8");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
