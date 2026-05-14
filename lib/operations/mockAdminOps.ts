import type { OpsStatusVariant } from "@/components/operations/opsTokens";

export type OpsAlert = {
  id: string;
  level: "info" | "watch" | "urgent";
  message: string;
  href?: string;
  hrefLabel?: string;
};

export type QueueSummary = {
  id: string;
  name: string;
  depth: number;
  oldestWait: string;
  slaHint: string;
  assignee: string | null;
  status: OpsStatusVariant;
};

export type WorkflowTimelineStep = {
  id: string;
  label: string;
  meta: string;
  at: string;
  variant: OpsStatusVariant;
};

export type ShipmentException = {
  id: string;
  orderRef: string;
  carrier: string;
  code: string;
  detail: string;
  attemptedAt: string;
  variant: OpsStatusVariant;
};

export type FulfillmentQueueRow = {
  id: string;
  slot: string;
  orderRef: string;
  items: string;
  eta: string;
  station: string;
  variant: OpsStatusVariant;
};

export type FulfillmentBatch = {
  id: string;
  orders: number;
  skuMix: string;
  station: string;
  queuedAt: string;
  variant: OpsStatusVariant;
};

export type CatalogRowMock = {
  id: string;
  name: string;
  sku: string;
  channel: string;
  stockBand: "low" | "ok" | "buffer";
  publishing: OpsStatusVariant;
};

export type ReportingPanelMock = {
  id: string;
  title: string;
  subtitle: string;
  metricPrimary: string;
  metricSecondary: string;
  barHint: number;
};

export type NotificationMockItem = {
  id: string;
  title: string;
  preview: string;
  at: string;
  workflowId: string;
  variant: OpsStatusVariant;
};

export type NotificationCategoryMock = {
  category: string;
  items: NotificationMockItem[];
};

export type RefundCaseRow = {
  id: string;
  orderRef: string;
  amount: string;
  reason: string;
  openedAt: string;
  variant: OpsStatusVariant;
};

export type SupportTicketMock = {
  id: string;
  subject: string;
  guest: string;
  channel: string;
  openedAt: string;
  severity: OpsStatusVariant;
};

export type CommThreadMock = {
  id: string;
  subject: string;
  anchor: string;
  lastAt: string;
  messages: { id: string; from: string; snippet: string; at: string }[];
};

export type CateringKanbanCard = {
  id: string;
  title: string;
  guest: string;
  pickupWindow: string;
  headcount: string;
  variant: OpsStatusVariant;
};

export type CateringColumnMock = {
  id: string;
  title: string;
  hint: string;
  cards: CateringKanbanCard[];
};

/** Command center strip */
export const adminOperationalAlerts: OpsAlert[] = [
  {
    id: "a1",
    level: "urgent",
    message: "2 outbound labels stalled — USPS timeout after rate fetch",
    href: "/admin/shipping",
    hrefLabel: "Shipping",
  },
  {
    id: "a2",
    level: "watch",
    message: "Catering SAT tray run needs confirmation by 14:30",
    href: "/admin/catering-orders",
    hrefLabel: "Catering",
  },
  {
    id: "a3",
    level: "info",
    message: "Fulfillment SLA healthy — oldest pack wait 06m",
  },
];

/** Four cards shown on `/admin` */
export const adminQueueSummariesHighlight: QueueSummary[] = [
  {
    id: "q-pack",
    name: "Packing & manifest",
    depth: 7,
    oldestWait: "06m",
    slaHint: "Target first touch under 10m",
    assignee: "Dock A · lead",
    status: "in_progress",
  },
  {
    id: "q-label",
    name: "Label purchase",
    depth: 3,
    oldestWait: "02m",
    slaHint: "Batch when ≥ 3 retail",
    assignee: null,
    status: "awaiting_label",
  },
  {
    id: "q-catering",
    name: "Catering prep",
    depth: 4,
    oldestWait: "38m",
    slaHint: "Tray assembly window",
    assignee: "Pastry",
    status: "scheduled",
  },
  {
    id: "q-support",
    name: "Support inbox",
    depth: 11,
    oldestWait: "2h 10m",
    slaHint: "First response tier-2",
    assignee: "On-call CX",
    status: "blocked",
  },
];

/** `/admin/queues` — aligns with workflows named in ops brief */
export const adminQueueSummariesAll: QueueSummary[] = [
  ...adminQueueSummariesHighlight,
  {
    id: "q-exc",
    name: "Shipment exceptions",
    depth: 2,
    oldestWait: "18m",
    slaHint: "Retry + guest comms",
    assignee: null,
    status: "exception",
  },
  {
    id: "q-refund",
    name: "Refunds review",
    depth: 1,
    oldestWait: "55m",
    slaHint: "Dual approval rules",
    assignee: "Lead cashier",
    status: "queued",
  },
  {
    id: "q-comms",
    name: "Comms follow-up",
    depth: 5,
    oldestWait: "41m",
    slaHint: "Thread owner rotation",
    assignee: null,
    status: "in_progress",
  },
];

export const adminShipmentExceptions: ShipmentException[] = [
  {
    id: "se1",
    orderRef: "MC-84921",
    carrier: "USPS Ground Advantage",
    code: "RATE_TIMEOUT",
    detail: "Carrier endpoint slow — queued retry · batch 004",
    attemptedAt: "12:06 PT",
    variant: "exception",
  },
  {
    id: "se2",
    orderRef: "MC-84905",
    carrier: "UPS®",
    code: "ADDR_VALIDATE",
    detail: "suite token missing · guest pinged · hold label",
    attemptedAt: "11:52 PT",
    variant: "blocked",
  },
  {
    id: "se3",
    orderRef: "MC-84888",
    carrier: "USPS Priority",
    code: "LABEL_VOID",
    detail: "reprint authorized · void pending confirmation",
    attemptedAt: "10:41 PT",
    variant: "in_progress",
  },
];

export const adminSupportTickets: SupportTicketMock[] = [
  {
    id: "t-204",
    subject: "Breakfast burrito trays — dairy swap request",
    guest: "A. Mercer",
    channel: "Email",
    openedAt: "09:22",
    severity: "exception",
  },
  {
    id: "t-205",
    subject: "Ship date slipped — Vallejo pickup",
    guest: "J. Ng",
    channel: "SMS",
    openedAt: "10:04",
    severity: "blocked",
  },
  {
    id: "t-206",
    subject: "Gift card receipt not delivered",
    guest: "C. Alvarez",
    channel: "Web form",
    openedAt: "10:51",
    severity: "queued",
  },
];

export const adminCateringKanban: CateringColumnMock[] = [
  {
    id: "col-hold",
    title: "Hold / quote",
    hint: "Deposits & headcount locks",
    cards: [
      {
        id: "c1",
        title: "Corporate breakfast · 120",
        guest: "North Bay Dental Co-op",
        pickupWindow: "Fri · 06:45–07:30",
        headcount: "120 plated",
        variant: "queued",
      },
    ],
  },
  {
    id: "col-confirmed",
    title: "Confirmed",
    hint: "Prep tickets issued",
    cards: [
      {
        id: "c2",
        title: "Wedding grazing · eve pickup",
        guest: "L. Osman",
        pickupWindow: "Sat · 16:30",
        headcount: "85 guests",
        variant: "scheduled",
      },
      {
        id: "c3",
        title: "School staff lunch trays",
        guest: "Vallejo USD — site 14",
        pickupWindow: "Thu · 11:15",
        headcount: "48 trays",
        variant: "in_progress",
      },
    ],
  },
  {
    id: "col-packing",
    title: "Packing lane",
    hint: "Cold chain + garnish",
    cards: [
      {
        id: "c4",
        title: "Film set — taco bar",
        guest: "Baylight Productions",
        pickupWindow: "Wed · catering dock",
        headcount: "60 covers",
        variant: "in_progress",
      },
    ],
  },
  {
    id: "col-ready",
    title: "Ready / out",
    hint: "Handoff confirmations",
    cards: [
      {
        id: "c5",
        title: "Nonprofit luncheon",
        guest: "Harbor Meals",
        pickupWindow: "Tue · 12:45 done",
        headcount: "200 buffet",
        variant: "delivered",
      },
    ],
  },
];

export const adminCatalogRows: CatalogRowMock[] = [
  {
    id: "p1",
    name: "Momo's house blend beans · 12oz",
    sku: "RET-HB-12",
    channel: "Shop",
    stockBand: "ok",
    publishing: "in_progress",
  },
  {
    id: "p2",
    name: "Breakfast burrito (standard)",
    sku: "CAF-BB-STD",
    channel: "Menu",
    stockBand: "low",
    publishing: "delivered",
  },
  {
    id: "p3",
    name: "Catering · taco tray (feeds 12)",
    sku: "CAT-TAC-12",
    channel: "Catering",
    stockBand: "buffer",
    publishing: "scheduled",
  },
  {
    id: "p4",
    name: "Merch apron · teal stitch",
    sku: "RET-APR-T",
    channel: "Shop",
    stockBand: "ok",
    publishing: "blocked",
  },
];

export const adminReportingPanels: ReportingPanelMock[] = [
  {
    id: "r1",
    title: "Queue health",
    subtitle: "Depth vs SLA · trailing 24h window",
    metricPrimary: "87% touches under SLA",
    metricSecondary: "3 queues in watch · 1 urgent",
    barHint: 0.82,
  },
  {
    id: "r2",
    title: "Blocked workflows",
    subtitle: "Human attention required",
    metricPrimary: "6 workflows paused",
    metricSecondary: "Top cause: carrier validation · 3",
    barHint: 0.38,
  },
  {
    id: "r3",
    title: "Outbound accuracy",
    subtitle: "Label purchase → scan events",
    metricPrimary: "99.4% labels match manifest",
    metricSecondary: "2 voids awaiting audit",
    barHint: 0.93,
  },
];

export const adminNotificationBuckets: NotificationCategoryMock[] = [
  {
    category: "Fulfillment",
    items: [
      {
        id: "n1",
        title: "Batch 004 stalled at rate shop",
        preview: "USPS timeouts · auto-retry in 90s · owner: shipping lead",
        at: "2m ago",
        workflowId: "wf_ship_label_v1",
        variant: "exception",
      },
      {
        id: "n2",
        title: "Manifest printed · Dock B",
        preview: "7 orders consolidated · QA stamp optional",
        at: "12m ago",
        workflowId: "wf_manifest_print",
        variant: "delivered",
      },
    ],
  },
  {
    category: "Guests & SLA",
    items: [
      {
        id: "n3",
        title: "First response SLA · Support",
        preview: "3 tickets over soft cap · escalate on-call?",
        at: "18m ago",
        workflowId: "wf_support_tier2",
        variant: "blocked",
      },
    ],
  },
  {
    category: "Finance",
    items: [
      {
        id: "n4",
        title: "Refund case MC-84921 flagged",
        preview: "$42.80 partial · requires dual sign-off mock",
        at: "32m ago",
        workflowId: "wf_refund_review",
        variant: "queued",
      },
    ],
  },
];

export const adminRefundCases: RefundCaseRow[] = [
  {
    id: "rf1",
    orderRef: "MC-84921",
    amount: "$42.80 partial",
    reason: "Shipment delay · retail beans",
    openedAt: "Mon 09:41",
    variant: "in_progress",
  },
  {
    id: "rf2",
    orderRef: "MC-84810",
    amount: "$18.40 full",
    reason: "Wrong pickup slot · café order",
    openedAt: "Sun 16:12",
    variant: "queued",
  },
  {
    id: "rf3",
    orderRef: "MC-84602",
    amount: "$0.00 waived fee",
    reason: "Courtesy comps · ops note",
    openedAt: "Sat 08:56",
    variant: "delivered",
  },
];

export const adminCommThreads: CommThreadMock[] = [
  {
    id: "th1",
    subject: "Catering SAT · tray timing",
    anchor: "order MC-84900",
    lastAt: "12:14 PT",
    messages: [
      { id: "m1", from: "Kitchen lead", snippet: "We can bump garnish 30m if dock clears.", at: "11:50" },
      { id: "m2", from: "CX Bot (draft)", snippet: "Suggested reply: confirming 14:30 handoff…", at: "12:05" },
      { id: "m3", from: "On-call CX", snippet: "Guest prefers earlier — checking tray temps.", at: "12:14" },
    ],
  },
  {
    id: "th2",
    subject: "Ship hold · address clarification",
    anchor: "shipment MC-84905",
    lastAt: "11:52 PT",
    messages: [
      { id: "m4", from: "Fulfillment", snippet: "USPS suite token missing · guest SMS sent.", at: "11:40" },
      { id: "m5", from: "Guest", snippet: "\"Suite 400 - loading dock B\"", at: "11:52" },
    ],
  },
];

export const adminOrderLookupMock = {
  queryExample: "#MC-84921 · confirm JN4K-Q8",
  orderRef: "MC-84921",
  placedAt: "May 13, 2026 · 09:18 PT",
  channel: "Shop · Vallejo fulfillment",
  lines: ["House blend beans · 12oz ×2", "Apron teal stitch ×1"],
  notes: [
    { id: "n1", at: "09:41", author: "Lead packer", body: "Hold label — USPS rate flake; queued retry batch 004." },
    { id: "n2", at: "10:02", author: "CX", body: "Guest ok with Tues ship if manifests align." },
  ],
  escalation: {
    tier: "Tier 2 · shipping",
    owner: "Jordan R.",
    nextStep: "If retry fails ×2 route to carrier swap playbook",
  },
  lifecycle: [
    { id: "l1", label: "Authorized", meta: "Payment capture", at: "09:18", variant: "delivered" as OpsStatusVariant },
    { id: "l2", label: "Picking", meta: "Zone B · SKU scan", at: "09:24", variant: "delivered" as OpsStatusVariant },
    { id: "l3", label: "Packing complete", meta: "Cold seal · QA optional", at: "09:33", variant: "delivered" as OpsStatusVariant },
    {
      id: "l4",
      label: "Label purchase",
      meta: "USPS Ground Advantage · hold",
      at: "09:41",
      variant: "exception" as OpsStatusVariant,
    },
    { id: "l5", label: "Handoff", meta: "Pending scan", at: "—", variant: "queued" as OpsStatusVariant },
  ] satisfies WorkflowTimelineStep[],
};

export const adminCustomerLookupMock = {
  queryPlaceholder: "email · phone · guest id",
  name: "Avery Mercer",
  hint: "Catering coordinator · Vallejo peninsula",
  tags: ["Catering tier B", "Dietary logs on file"],
  ordersSnippet: ["MC-84900 SAT trays", "MC-84302 cafe pickup recurring"],
};

export const adminFulfillmentRows: FulfillmentQueueRow[] = [
  {
    id: "f1",
    slot: "A-14",
    orderRef: "MC-84930",
    items: "Burrito trays ×24 · napkins",
    eta: "+18m prep",
    station: "Hot line · 2",
    variant: "in_progress",
  },
  {
    id: "f2",
    slot: "B-02",
    orderRef: "MC-84917",
    items: "Retail bundle · mugs + beans",
    eta: "Cold pack staging",
    station: "Pack · 3",
    variant: "picked",
  },
  {
    id: "f3",
    slot: "C-08",
    orderRef: "MC-84912",
    items: "Catering sampler · garnish hold",
    eta: "Awaiting QA stamp",
    station: "Garnish",
    variant: "blocked",
  },
];

export const adminFulfillmentBatches: FulfillmentBatch[] = [
  {
    id: "B-004",
    orders: 7,
    skuMix: "Retail · USPS batched",
    station: "Label desk",
    queuedAt: "12:06 PT",
    variant: "awaiting_label",
  },
  {
    id: "B-005",
    orders: 3,
    skuMix: "Café cold chain",
    station: "Cooler outbound",
    queuedAt: "11:54 PT",
    variant: "in_progress",
  },
];

export const adminDashboardActivity: WorkflowTimelineStep[] = adminOrderLookupMock.lifecycle;

export const adminSupportBacklogSummary = {
  open: adminSupportTickets.length,
  overdueSoft: 2,
};
