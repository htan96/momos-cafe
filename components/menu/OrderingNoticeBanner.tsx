"use client";

interface OrderingNoticeBannerProps {
  message: string;
  /** `closed` = red admin-style alert; `schedule` = calm scheduling info */
  tone?: "closed" | "schedule";
}

export default function OrderingNoticeBanner({
  message,
  tone = "closed",
}: OrderingNoticeBannerProps) {
  const schedule = tone === "schedule";
  return (
    <div
      className={
        schedule
          ? "bg-teal-dark/95 text-cream px-5 py-3.5 text-center text-sm font-medium leading-relaxed border-b border-teal"
          : "bg-charcoal/88 text-cream px-5 py-3.5 text-center text-sm font-medium leading-relaxed border-b border-cream-dark/40"
      }
      role="status"
    >
      {message}
    </div>
  );
}
