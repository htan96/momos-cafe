"use client";

interface OrderingClosedBannerProps {
  message: string;
}

export default function OrderingClosedBanner({ message }: OrderingClosedBannerProps) {
  return (
    <div
      className="bg-red/90 text-white px-6 py-4 text-center font-semibold text-sm tracking-wide"
      role="alert"
    >
      {message}
    </div>
  );
}
