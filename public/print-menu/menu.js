/**
 * Print menu renderer — layout is static; only JSON data changes.
 * Schema: see menu-data.json (pages.breakfast[], pages.lunch[], pages.extras)
 */

(function () {
  "use strict";

  /** Resolved default JSON URL (same folder as this page). */
  let defaultJsonHref = "./menu-data.json";
  try {
    defaultJsonHref = new URL("menu-data.json", window.location.href).href;
  } catch {
    /* keep relative */
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
    row.innerHTML =
      '<span class="menu-item__name">' +
      escapeHtml(String(item.name ?? "")) +
      "</span>" +
      (showPrice
        ? '<span class="menu-item__price">' +
          escapeHtml(formatPrice(/** @type {number} */ (priceVal))) +
          "</span>"
        : "");
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
        "</span>" +
        '<span class="menu-item__extra-price">' +
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
   * @param {HTMLElement} root
   */
  function renderAll(data, root) {
    root.replaceChildren();
    const pages =
      data && typeof data === "object" && data.pages && typeof data.pages === "object"
        ? /** @type {{ pages: Record<string, unknown> }} */ (data).pages
        : {};

    const breakfast = Array.isArray(pages.breakfast) ? pages.breakfast : [];
    const lunch = Array.isArray(pages.lunch) ? pages.lunch : [];
    const extras =
      pages.extras && typeof pages.extras === "object"
        ? /** @type {Record<string, unknown>} */ (pages.extras)
        : {};

    root.appendChild(renderBreakfastPage(breakfast));
    root.appendChild(renderLunchPage(lunch));
    root.appendChild(renderExtrasPage(extras));
  }

  /**
   * @param {HTMLElement} root
   */
  async function loadDefaultJson(root) {
    const res = await fetch(defaultJsonHref, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load menu-data.json");
    const data = await res.json();
    renderAll(data, root);
  }

  function init() {
    const root = document.getElementById("menu-root");
    const btnPrint = document.getElementById("btn-print");
    const btnReset = document.getElementById("btn-reset");
    const inputJson = document.getElementById("input-json");

    if (!root || !btnPrint || !btnReset || !inputJson) return;

    loadDefaultJson(root).catch((err) => {
      console.error(err);
      root.innerHTML =
        '<p style="padding:1rem;color:#c00;">Could not load menu data. Open this page via a local or hosted server (not file://) or check menu-data.json.</p>';
    });

    btnPrint.addEventListener("click", () => {
      window.print();
    });

    btnReset.addEventListener("click", () => {
      loadDefaultJson(root).catch(console.error);
      /** @type {HTMLInputElement} */ (inputJson).value = "";
    });

    inputJson.addEventListener("change", () => {
      const file = /** @type {HTMLInputElement} */ (inputJson).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          renderAll(data, root);
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
