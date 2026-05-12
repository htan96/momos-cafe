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
          : "bg-red/90 text-white px-6 py-4 text-center font-semibold text-sm tracking-wide"
      }
      role="status"
    >
      {message}
    </div>
  );
}
