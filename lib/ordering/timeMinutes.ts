import { parseHm } from "@/lib/ordering/tzWallClock";

/** Minutes from midnight for an "HH:mm" string in 24h. */
export function hmToMinutesSafe(hhmm: string): number {
  const { hour, minute } = parseHm(hhmm);
  return hour * 60 + minute;
}
