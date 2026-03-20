"use client";

import { useEffect, useState } from "react";

type CateringInquiry = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  event_date: string;
  guest_count: number;
  event_type: string | null;
  details: string | null;
  created_at?: string;
};

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CateringRequestsPanel() {
  const [inquiries, setInquiries] = useState<CateringInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!id || deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/catering-inquiries/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to delete");
      }
      setInquiries((prev) => prev.filter((inq) => inq.id !== id));
      setExpandedId((prev) => (prev === id ? null : prev));
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "Could not delete inquiry.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    async function fetchInquiries() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/catering-inquiries");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "Failed to fetch");
        }
        setInquiries(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Catering inquiries fetch error:", err);
        setError(err instanceof Error ? err.message : "Could not load catering inquiries.");
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    }
    fetchInquiries();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border-2 border-cream-dark rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
        <h2 className="font-display text-xl text-charcoal mb-4">
          Catering Inquiries
        </h2>
        <p className="text-gray-mid">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-cream-dark rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
        <h2 className="font-display text-xl text-charcoal mb-4">
          Catering Inquiries
        </h2>
        <p className="text-red font-medium">{error}</p>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="bg-white border-2 border-cream-dark rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
        <h2 className="font-display text-xl text-charcoal mb-4">
          Catering Inquiries
        </h2>
        <p className="text-gray-mid">No inquiries yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-cream-dark rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
      <h2 className="font-display text-xl text-charcoal mb-4">
        Catering Inquiries
      </h2>
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {inquiries.map((inq, index) => {
          const id = inq.id ?? `row-${index}`;
          const isExpanded = expandedId === id;
          return (
            <div
              key={id}
              className="border border-cream-dark rounded-xl p-4 bg-cream/30 hover:bg-cream/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-charcoal">{inq.name}</div>
                    <div className="flex items-center gap-3 text-sm text-gray-mid">
                      <span>{formatDate(inq.event_date)}</span>
                      {inq.guest_count > 0 && (
                        <span>{inq.guest_count} guests</span>
                      )}
                      <span className="text-charcoal/50">
                        {formatDate(inq.created_at)}
                      </span>
                      <span className="text-teal text-xs">
                        {isExpanded ? "▲ Less" : "▼ More"}
                      </span>
                    </div>
                  </div>
                  {inq.event_type && (
                    <p className="text-sm text-charcoal/65 mt-1">
                      {inq.event_type}
                    </p>
                  )}
                </button>
                {inq.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(inq.id!);
                    }}
                    disabled={deletingId === inq.id}
                    className="text-red text-xs font-semibold shrink-0 py-1 px-2 hover:underline disabled:opacity-50"
                    title="Delete inquiry"
                  >
                    {deletingId === inq.id ? "…" : "Delete"}
                  </button>
                )}
              </div>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-cream-dark space-y-2 text-sm">
                  <div className="flex flex-wrap gap-4">
                    <a
                      href={`mailto:${inq.email}`}
                      className="text-teal hover:underline"
                    >
                      {inq.email}
                    </a>
                    <a
                      href={`tel:${inq.phone}`}
                      className="text-teal hover:underline"
                    >
                      {inq.phone}
                    </a>
                  </div>
                  {inq.details && (
                    <p className="text-charcoal/70 leading-relaxed font-medium">
                      {inq.details}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
