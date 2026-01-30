"use client";
import { ReactNode } from "react";
import { X } from "lucide-react";

interface CateringModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function CateringModal({
  isOpen,
  onClose,
  children,
}: CateringModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#FFF8EA] w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border-2 border-[#C43B2F] p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#C43B2F] hover:opacity-70"
        >
          <X size={28} />
        </button>

        {children}
      </div>
    </div>
  );
}
