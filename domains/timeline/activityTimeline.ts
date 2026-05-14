export const TIMELINE_VISIBILITY_SCOPES = [
  "customer",
  "admin",
  "super_admin",
  "internal",
] as const;

export type TimelineVisibilityScope = (typeof TIMELINE_VISIBILITY_SCOPES)[number];

export type ActivityTimelineEntry = Readonly<{
  id: string;
  atIso: string;
  /** Short headline shown in timelines */
  title: string;
  detail?: string;
  /** Audience gate — arrays mean union visibility */
  visibility: TimelineVisibilityScope | readonly TimelineVisibilityScope[];
  refs?: Readonly<{ domain: string; id: string }[]>;
}>;
