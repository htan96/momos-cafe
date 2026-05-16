"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CateringInquiryStatus } from "@prisma/client";
import { CateringInquiryStatus as StatusEnum } from "@prisma/client";
import {
  CATERING_INQUIRY_STATUS_LABELS,
  CATERING_INQUIRY_STATUS_VALUES,
} from "@/lib/catering/cateringInquiryStatus";

import type { CateringInquiryDetailPayload } from "@/lib/catering/cateringInquiryDetailPayload";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CateringInquiryDetailForm({
  inquiry,
  listHref,
}: {
  inquiry: CateringInquiryDetailPayload;
  listHref: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<CateringInquiryStatus>(inquiry.status);
  const [assignedTo, setAssignedTo] = useState(inquiry.assignedTo ?? "");
  const [internalNotes, setInternalNotes] = useState(inquiry.internalNotes ?? "");
  const [lastFollowUpLocal, setLastFollowUpLocal] = useState(
    toDatetimeLocal(inquiry.lastFollowUpAt)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        status,
        assignedTo: assignedTo.trim() || null,
        internalNotes: internalNotes || null,
      };

      if (lastFollowUpLocal) {
        body.lastFollowUpAt = new Date(lastFollowUpLocal).toISOString();
      } else if (status !== StatusEnum.contacted) {
        body.lastFollowUpAt = null;
      }

      const res = await fetch(`/api/admin/catering-inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Save failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this inquiry permanently?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/catering-inquiries/${inquiry.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Delete failed");
      }
      router.push(listHref);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5 rounded-xl border border-cream-dark bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <h2 className="font-display text-lg text-charcoal">Inquiry</h2>
        {inquiry.submissionError ? (
          <div className="rounded-lg border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
            <p className="font-semibold">Submission error (stored)</p>
            <p className="mt-1 whitespace-pre-wrap text-charcoal/80">{inquiry.submissionError}</p>
          </div>
        ) : null}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/45">
              Name
            </dt>
            <dd className="font-medium text-charcoal">{inquiry.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/45">
              Guests
            </dt>
            <dd className="text-charcoal">{inquiry.guestCount}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/45">
              Email
            </dt>
            <dd>
              <a href={`mailto:${inquiry.email}`} className="text-teal-dark hover:underline">
                {inquiry.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/45">
              Phone
            </dt>
            <dd>
              <a href={`tel:${inquiry.phone}`} className="text-teal-dark hover:underline">
                {inquiry.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/45">
              Event date
            </dt>
            <dd className="text-charcoal">{inquiry.eventDate}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/45">
              Style
            </dt>
            <dd className="text-charcoal">{inquiry.eventType ?? "—"}</dd>
          </div>
        </dl>
        {inquiry.details ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/45">
              Customer notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-charcoal/80">
              {inquiry.details}
            </p>
          </div>
        ) : null}
        <p className="text-xs text-charcoal/45">
          Submitted {new Date(inquiry.createdAt).toLocaleString()}
          {inquiry.contactedAt
            ? ` · Contacted ${new Date(inquiry.contactedAt).toLocaleString()}`
            : ""}
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-cream-dark bg-cream/20 p-6">
        <h2 className="font-display text-lg text-charcoal">Staff workflow</h2>
        {error ? <p className="text-sm font-medium text-red">{error}</p> : null}

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-charcoal">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CateringInquiryStatus)}
            className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-charcoal"
          >
            {CATERING_INQUIRY_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {CATERING_INQUIRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-charcoal">Assigned to</span>
          <input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Email or Cognito sub"
            className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-charcoal"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-charcoal">Last follow-up</span>
          <input
            type="datetime-local"
            value={lastFollowUpLocal}
            onChange={(e) => setLastFollowUpLocal(e.target.value)}
            className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-charcoal"
          />
          <span className="mt-1 block text-[11px] text-charcoal/50">
            Leave blank when setting status to Contacted to stamp &ldquo;now&rdquo; automatically.
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-charcoal">Internal notes</span>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-charcoal"
          />
        </label>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-teal-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={listHref}
            className="rounded-lg border border-cream-dark bg-white px-4 py-2 text-sm font-semibold text-charcoal hover:bg-cream/60"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={deleting}
            className="ml-auto rounded-lg border border-red/40 bg-white px-4 py-2 text-sm font-semibold text-red hover:bg-red/5 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
