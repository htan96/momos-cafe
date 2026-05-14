/** Rich UI mocks for customer portal placeholder routes — no API backing. */

export const mockCustomerOrders = [
  {
    id: "mock-ord-01",
    orderNumber: "4821",
    placedAt: "May 10, 2026 · 11:20 AM",
    summary: "Café pickup · Assorted momos & jasmine tea",
    totalLabel: "$42.18",
    status: "preparing" as const,
    etaReassurance: "We’re pacing your pickup so everything arrives hot together.",
    pipelineBadges: ["Café pickup"],
  },
  {
    id: "mock-ord-02",
    orderNumber: "4755",
    placedAt: "May 8, 2026 · 3:05 PM",
    summary: "Shop & shipment · Gift box & card",
    totalLabel: "$86.40",
    status: "shipped" as const,
    etaReassurance: "On its way — you’ll get tracking pings as it moves.",
    pipelineBadges: ["Shop & shipment"],
  },
  {
    id: "mock-ord-03",
    orderNumber: "4602",
    placedAt: "Apr 28, 2026 · 6:40 PM",
    summary: "Catering hold · Spring office lunch",
    totalLabel: "$1,240.00",
    status: "scheduled" as const,
    etaReassurance: "Concierge is aligning your drop-off window with the host.",
    pipelineBadges: ["Catering"],
  },
  {
    id: "mock-ord-04",
    orderNumber: "4511",
    placedAt: "Apr 19, 2026 · 12:15 PM",
    summary: "Shop & shipment · Snack crate",
    totalLabel: "$58.95",
    status: "delivered" as const,
    etaReassurance: "Left at your doorstep per instructions.",
    pipelineBadges: ["Shop & shipment"],
  },
];

export const mockShipments = [
  {
    id: "mock-ship-01",
    orderRef: "Order #4755",
    carrier: "UPS®",
    destination: "Seattle, WA",
    trackingMasked: "1Z·**··**··9091",
    status: "shipped" as const,
    delayed: false,
    timeline: [
      { label: "Label created", time: "May 8 · 4:12 PM" },
      { label: "Departed our kitchen hub", time: "May 9 · 8:05 AM" },
      { label: "In transit", time: "May 10 · 6:18 AM" },
    ],
  },
  {
    id: "mock-ship-02",
    orderRef: "Order #4690",
    carrier: "USPS Priority",
    destination: "Portland, OR",
    trackingMasked: "9400·**··**··2214",
    status: "exception" as const,
    delayed: true,
    timeline: [
      { label: "Picked up", time: "May 6 · 10:22 AM" },
      { label: "Weather delay · regional sort", time: "May 7 · 2:44 PM" },
      { label: "Recovered — back on route", time: "May 9 · 9:10 AM" },
    ],
  },
  {
    id: "mock-ship-03",
    orderRef: "Order #4602",
    carrier: "Courier",
    destination: "Bellevue, WA",
    trackingMasked: "MOM·**··**··884",
    status: "scheduled" as const,
    delayed: false,
    timeline: [
      { label: "Hold for event date", time: "Apr 28 · 7:00 PM" },
      { label: "Assembly scheduled", time: "May 11 · 9:00 AM" },
      { label: "Outbound window", time: "May 14 · 11:30 AM" },
    ],
  },
];

export type MockInvoice = {
  id: string;
  label: string;
  subtitle: string;
  amount: string;
  date: string;
  kind: "catering" | "retail";
  status: "paid" | "due";
};

export const mockInvoices: MockInvoice[] = [
  {
    id: "inv-1",
    label: "Catering · Spring studio lunch",
    subtitle: "INV-MOM-2404",
    amount: "$1,240.00",
    date: "Apr 30, 2026",
    kind: "catering",
    status: "paid",
  },
  {
    id: "inv-2",
    label: "Catering · Kids’ dumpling workshop",
    subtitle: "INV-MOM-2388",
    amount: "$640.00",
    date: "Mar 12, 2026",
    kind: "catering",
    status: "paid",
  },
  {
    id: "inv-3",
    label: "Retail · Pantry restock bundle",
    subtitle: "INV-MOM-6402",
    amount: "$118.40",
    date: "May 2, 2026",
    kind: "retail",
    status: "paid",
  },
  {
    id: "inv-4",
    label: "Retail · Gift tower",
    subtitle: "INV-MOM-6410",
    amount: "$96.00",
    date: "May 9, 2026",
    kind: "retail",
    status: "due",
  },
];

export const mockCateringPipeline = [
  {
    stage: "Concierge",
    tone: "muted" as const,
    cards: [
      {
        title: "Anniversary brunch inquiry",
        meta: "Submitted · 12 guests",
        body: "We’re pairing vegetarian trays with sparkling cider.",
      },
    ],
  },
  {
    stage: "Chef review",
    tone: "current" as const,
    cards: [
      {
        title: "Office lunch · Capitol Hill",
        meta: "Menu draft · 28 guests",
        body: "Hot momos + chilled salads + labeled allergens.",
      },
    ],
  },
  {
    stage: "Confirmed",
    tone: "done" as const,
    cards: [
      {
        title: "Baby shower · Wallingford",
        meta: "Sat · May 17",
        body: "Pickup window locked · 10:45–11:15.",
      },
    ],
  },
] as const;

export const mockRewardsActivity = [
  { id: "r1", title: "Welcome perk unlocked", detail: "Complimentary jasmine tea on your next visit.", when: "May 1" },
  { id: "r2", title: "Tier boost", detail: "Host level — enjoy priority pickup wording.", when: "Apr 18" },
  { id: "r3", title: "Birthday month", detail: "A little sweet surprise is reserved for you.", when: "Apr 3" },
];

export const mockCommunications = [
  {
    id: "c1",
    subject: "Your pickup is being plated",
    preview: "We’re staging sauces on the side so nothing goes soggy.",
    when: "Today · 10:42 AM",
    channel: "Email",
  },
  {
    id: "c2",
    subject: "Catering follow-up from Momo’s",
    preview: "A quick note on dietary tags for next week’s office lunch.",
    when: "Yesterday · 4:06 PM",
    channel: "Email",
  },
];
