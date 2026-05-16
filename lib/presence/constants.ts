/** HttpOnly presence cookie — set by `/api/presence/heartbeat` or `/api/presence/bootstrap`. */
export const PRESENCE_SESSION_COOKIE = "momos_presence_sid";

/** Ignore heartbeat writes closer than this (optional rate limit). */
export const PRESENCE_HEARTBEAT_MIN_INTERVAL_MS = 10_000;

/** Presence rows older than this are excluded from “live” views. */
export const PRESENCE_LIVE_WINDOW_MINUTES = 20;

/** Idle window for computed “active” in UI (matches live query window). */
export const PRESENCE_IDLE_MINUTES = PRESENCE_LIVE_WINDOW_MINUTES;

/**
 * MVP: authenticated sessions only — no anonymous/guest `PlatformPresenceSession` rows.
 * TODO: optional guest presence behind explicit consent + route allowlist (not enabled).
 */
