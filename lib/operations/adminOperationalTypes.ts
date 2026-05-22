/** Operational UI alert strip — no fabricated payloads. */
export type OpsAlert = {
  id: string;
  level: "info" | "watch" | "urgent";
  message: string;
  href?: string;
  hrefLabel?: string;
};
