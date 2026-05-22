"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity } from "lucide-react";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import SuperAdminEmptyPanel from "@/components/super-admin/SuperAdminEmptyPanel";
import {
  filterLiveActivityEvents,
  LIVE_ACTIVITY_FILTER_IDS,
  type LiveActivityFilterId,
} from "@/lib/liveActivity/liveActivityFilters";
import { formatAbsoluteTimestamp } from "@/lib/liveActivity/formatActivityTime";
import type {
  LiveActivityEvent,
  LiveActivityFeedResponse,
  LiveActivitySnapshotsResponse,
  LiveActivitySurfaceState,
} from "@/lib/liveActivity/types";
import ActivityFilterBar from "./ActivityFilterBar";
import ActivitySnapshotPanel from "./ActivitySnapshotPanel";
import LiveActivityEventCard from "./LiveActivityEventCard";
import LiveActivityIncidentBanner from "./LiveActivityIncidentBanner";

const DEFAULT_POLL_MS = 20_000;
const MIN_POLL_MS = 15_000;
const MAX_POLL_MS = 30_000;

type Props = {
  initialFeed: LiveActivityFeedResponse;
  initialSnapshots: LiveActivitySnapshotsResponse;
  commerceOrderId?: string;
  incidentId?: string;
  initialServerFilter?: LiveActivityFilterId;
};

function mergeEvents(existing: LiveActivityEvent[], incoming: LiveActivityEvent[]): LiveActivityEvent[] {
  const map = new Map<string, LiveActivityEvent>();
  for (const e of incoming) map.set(e.id, e);
  for (const e of existing) if (!map.has(e.id)) map.set(e.id, e);
  return [...map.values()].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

function surfaceLabel(state: LiveActivitySurfaceState): string {
  switch (state) {
    case "monitoring":
      return "Monitoring";
    case "paused":
      return "Paused";
    case "stale":
      return "Stale";
    default:
      return "Standing by";
  }
}

function surfacePillVariant(state: LiveActivitySurfaceState): "ok" | "warning" | "degraded" | "neutral" {
  switch (state) {
    case "monitoring":
      return "ok";
    case "paused":
      return "warning";
    case "stale":
      return "degraded";
    default:
      return "neutral";
  }
}

export default function LiveActivityWorkspace({
  initialFeed,
  initialSnapshots,
  commerceOrderId,
  incidentId,
  initialServerFilter,
}: Props) {
  const commerceScope = commerceOrderId?.trim() ?? "";
  const incidentRaw = incidentId?.trim() ?? "";
  const incidentScope =
    incidentRaw.length >= 10 && /^[a-z][a-z0-9_-]*$/i.test(incidentRaw) ? incidentRaw : "";

  const [events, setEvents] = useState<LiveActivityEvent[]>(initialFeed.events);
  const [snapshots, setSnapshots] = useState<LiveActivitySnapshotsResponse>(initialSnapshots);
  const initialChip =
    initialServerFilter &&
    LIVE_ACTIVITY_FILTER_IDS.includes(initialServerFilter as LiveActivityFilterId) &&
    initialServerFilter !== "ALL"
      ? initialServerFilter
      : ("ALL" as LiveActivityFilterId);

  const [filter, setFilter] = useState<LiveActivityFilterId>(initialChip);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [paused, setPaused] = useState(false);
  const [pollMs, setPollMs] = useState(initialFeed.pollingIntervalMs ?? DEFAULT_POLL_MS);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialFeed.fetchedAt);
  const [surfaceState, setSurfaceState] = useState<LiveActivitySurfaceState>("monitoring");
  const [pendingNewCount, setPendingNewCount] = useState(0);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const latestSeenAtRef = useRef(initialFeed.events[0]?.occurredAt ?? initialFeed.fetchedAt);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const visibleEvents = useMemo(
    () => filterLiveActivityEvents(events, filter, searchQuery),
    [events, filter, searchQuery]
  );

  const buildFeedQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (filter !== "ALL") params.set("filter", filter);
    if (commerceScope && /^[0-9a-f-]{36}$/i.test(commerceScope)) {
      params.set("commerceOrderId", commerceScope);
    }
    if (incidentScope) {
      params.set("incidentId", incidentScope);
    }
    return params.toString();
  }, [filter, commerceScope, incidentScope]);

  const fetchSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    try {
      const res = await fetch("/api/super-admin/live-activity/snapshots", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`snapshots ${res.status}`);
      const data = (await res.json()) as LiveActivitySnapshotsResponse;
      setSnapshots(data);
    } catch {
      /* snapshots are best-effort */
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  const pollFeed = useCallback(async () => {
    if (!autoRefresh) return;

    try {
      const incrementalParams = new URLSearchParams(buildFeedQuery());
      incrementalParams.set("since", latestSeenAtRef.current);

      const [incrementalRes, pageRes] = await Promise.all([
        fetch(`/api/super-admin/live-activity/feed?${incrementalParams.toString()}`, {
          credentials: "same-origin",
        }),
        paused
          ? Promise.resolve(null)
          : fetch(`/api/super-admin/live-activity/feed?${buildFeedQuery()}`, { credentials: "same-origin" }),
      ]);

      if (incrementalRes.ok) {
        const incremental = (await incrementalRes.json()) as LiveActivityFeedResponse;
        setPollMs(
          Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, incremental.pollingIntervalMs ?? DEFAULT_POLL_MS))
        );
        setLastUpdatedAt(incremental.fetchedAt);
        setFeedError(null);
        setSurfaceState(paused ? "paused" : "monitoring");

        const newer = incremental.events.filter(
          (e) => new Date(e.occurredAt).getTime() > new Date(latestSeenAtRef.current).getTime()
        );

        if (newer.length > 0) {
          if (paused || userScrolledUpRef.current) {
            setPendingNewCount((c) => c + newer.length);
          } else {
            setEvents((prev) => mergeEvents(newer, prev));
          }
          latestSeenAtRef.current = newer[0]?.occurredAt ?? latestSeenAtRef.current;
        }
      } else {
        throw new Error(`feed ${incrementalRes.status}`);
      }

      if (pageRes?.ok) {
        const page = (await pageRes.json()) as LiveActivityFeedResponse;
        if (!paused && !userScrolledUpRef.current) {
          setEvents(page.events);
          if (page.events[0]) latestSeenAtRef.current = page.events[0].occurredAt;
        }
      }

      await fetchSnapshots();
    } catch {
      setFeedError("Live feed poll failed");
      setSurfaceState("stale");
    }
  }, [autoRefresh, buildFeedQuery, fetchSnapshots, paused]);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/super-admin/live-activity/feed?${buildFeedQuery()}`, {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const page = (await res.json()) as LiveActivityFeedResponse;
      setEvents(page.events);
      setLastUpdatedAt(page.fetchedAt);
      if (page.events[0]) latestSeenAtRef.current = page.events[0].occurredAt;
      setPendingNewCount(0);
      userScrolledUpRef.current = false;
    })();
  }, [buildFeedQuery]);

  useEffect(() => {
    if (!autoRefresh) {
      setSurfaceState("paused");
      return;
    }
    void pollFeed();
    const id = window.setInterval(() => void pollFeed(), pollMs);
    return () => window.clearInterval(id);
  }, [autoRefresh, pollFeed, pollMs]);

  useEffect(() => {
    setEvents(initialFeed.events);
    latestSeenAtRef.current = initialFeed.events[0]?.occurredAt ?? initialFeed.fetchedAt;
  }, [initialFeed]);

  const handleScroll = () => {
    const el = feedScrollRef.current;
    if (!el) return;
    userScrolledUpRef.current = el.scrollTop > 48;
  };

  const revealPending = () => {
    setPendingNewCount(0);
    userScrolledUpRef.current = false;
    void (async () => {
      const res = await fetch(`/api/super-admin/live-activity/feed?${buildFeedQuery()}`, {
        credentials: "same-origin",
      });
      if (res.ok) {
        const page = (await res.json()) as LiveActivityFeedResponse;
        setEvents(page.events);
        if (page.events[0]) latestSeenAtRef.current = page.events[0].occurredAt;
        feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    })();
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <LiveActivityIncidentBanner incidents={snapshots.activeIncidents.top} />

        <OperationalCard
          title="Live event stream"
          meta={
            <span className="flex flex-wrap items-center gap-2 justify-end">
              <StatusPill variant={surfacePillVariant(surfaceState)}>{surfaceLabel(surfaceState)}</StatusPill>
              <span className="text-[11px] text-charcoal/45">
                Updated {formatAbsoluteTimestamp(lastUpdatedAt)}
              </span>
            </span>
          }
        >
          <div className="space-y-4">
            {commerceScope ? (
              <p className="text-[12px] text-charcoal/60 rounded-lg border border-cream-dark/40 bg-white/70 px-3 py-2">
                Server scope ·{" "}
                <Link
                  href={`/super-admin/order-operations/${commerceScope}`}
                  className="font-mono text-teal-dark font-semibold hover:underline break-all"
                  title={commerceScope}
                >
                  commerceOrderId {commerceScope.slice(0, 8)}…
                </Link>
              </p>
            ) : null}

            {incidentScope ? (
              <p className="text-[12px] text-charcoal/60 rounded-lg border border-cream-dark/40 bg-white/70 px-3 py-2">
                Feed scoped ·{" "}
                <Link
                  href={`/super-admin/incidents?highlight=${encodeURIComponent(incidentScope)}`}
                  className="font-mono text-teal-dark font-semibold hover:underline break-all"
                  title={incidentScope}
                >
                  incident {incidentScope.slice(0, 10)}…
                </Link>{" "}
                <span className="normal-case tracking-normal font-sans font-normal text-[11px] text-charcoal/45">
                  (only OperationalActivityEvent ids stored on incident source_event_ids)
                </span>
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 justify-between">
              <ActivityFilterBar
                filter={filter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onFilterChange={setFilter}
              />
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <label className="flex items-center gap-2 text-[12px] text-charcoal/70">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-cream-dark"
                  />
                  Auto-refresh
                </label>
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 hover:bg-cream-mid/40"
                >
                  {paused ? "Resume feed" : "Pause feed"}
                </button>
                {pendingNewCount > 0 ? (
                  <button
                    type="button"
                    onClick={revealPending}
                    className="rounded-full bg-teal-dark px-3 py-1 text-[12px] font-semibold text-white shadow-sm"
                  >
                    {pendingNewCount} new
                  </button>
                ) : null}
              </div>
            </div>

            {feedError ? (
              <p className="text-[13px] text-red-dark/90 border border-red-dark/20 rounded-lg px-3 py-2 bg-red-50/50">
                {feedError}
              </p>
            ) : null}

            <div ref={feedScrollRef} onScroll={handleScroll} className="max-h-[min(70vh,720px)] overflow-y-auto pr-1">
              {visibleEvents.length === 0 ? (
                <SuperAdminEmptyPanel
                  icon={Activity}
                  title="No matching activity"
                  description="The feed is wired to Postgres operational events — nothing matches these filters yet."
                />
              ) : (
                <ul className="divide-y divide-cream-dark/40">
                  {visibleEvents.map((event) => (
                    <LiveActivityEventCard key={event.id} event={event} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </OperationalCard>

        <p className="text-[12px] text-charcoal/50 leading-relaxed">
          Polling every {Math.round(pollMs / 1000)}s — SSE/WebSocket push is stubbed in{" "}
          <code className="font-mono text-[11px]">lib/liveActivity/types.ts</code> for a future upgrade.
        </p>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 self-start">
        <ActivitySnapshotPanel snapshots={snapshots} loading={snapshotsLoading} />
        <p className="text-[12px] text-charcoal/50">
          <Link href="/super-admin/operations/failures" className="text-teal-dark font-semibold hover:underline">
            Failures inbox
          </Link>{" "}
          · triage overlay for fault subtypes
        </p>
      </aside>
    </div>
  );
}
