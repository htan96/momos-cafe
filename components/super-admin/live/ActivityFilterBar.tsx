"use client";

import {
  LIVE_ACTIVITY_FILTER_IDS,
  LIVE_ACTIVITY_FILTER_LABEL,
  type LiveActivityFilterId,
} from "@/lib/liveActivity/liveActivityFilters";

type Props = {
  filter: LiveActivityFilterId;
  searchQuery: string;
  onFilterChange: (filter: LiveActivityFilterId) => void;
  onSearchChange: (query: string) => void;
};

export default function ActivityFilterBar({ filter, searchQuery, onFilterChange, onSearchChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {LIVE_ACTIVITY_FILTER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onFilterChange(id)}
            className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
              filter === id
                ? "border-teal-dark/40 bg-teal-dark/10 text-teal-dark"
                : "border-cream-dark/60 bg-white text-charcoal/70 hover:bg-cream-mid/40"
            }`}
          >
            {LIVE_ACTIVITY_FILTER_LABEL[id]}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="sr-only">Search activity</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search summary, subtype, ids…"
          className="w-full rounded-lg border border-cream-dark/60 bg-white px-3 py-2 text-[13px] text-charcoal shadow-sm placeholder:text-charcoal/40 focus:border-teal-dark/40 focus:outline-none focus:ring-2 focus:ring-teal-dark/15"
        />
      </label>
    </div>
  );
}
