"use client";

import { useEffect } from "react";

/** Scroll/highlights `#incident-row-{id}` when linked from Ops surfaces. */
export default function IncidentHighlightEffect({ incidentId }: { incidentId?: string }) {
  useEffect(() => {
    if (!incidentId) return;
    const el = document.getElementById(`incident-row-${incidentId}`);
    if (!el) return;

    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    el.classList.add("ring-2", "ring-teal/55", "ring-offset-2", "rounded-lg");
    const t = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-teal/55", "ring-offset-2", "rounded-lg");
    }, 2400);

    return () => window.clearTimeout(t);
  }, [incidentId]);

  return null;
}
