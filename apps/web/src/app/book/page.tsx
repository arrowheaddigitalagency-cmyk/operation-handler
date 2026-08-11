"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";

function BookForm() {
  const params = useSearchParams();
  const analysisId = params.get("analysisId") ?? undefined;
  const reportId = params.get("reportId") ?? undefined;
  const [done, setDone] = useState<{ trackingId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const scheduledRaw = String(fd.get("scheduledAt") || "");
    const scheduledAt = new Date(scheduledRaw);
    if (!scheduledRaw || Number.isNaN(scheduledAt.getTime())) {
      setError("Pick a valid date and time for your inspection.");
      setLoading(false);
      return;
    }

    const yearRaw = String(fd.get("year") || "").trim();
    const year = yearRaw ? Number(yearRaw) : undefined;
    if (yearRaw && (!Number.isFinite(year) || year! < 1980 || year! > 2100)) {
      setError("Vehicle year must be between 1980 and 2100.");
      setLoading(false);
      return;
    }

    try {
      const res = await api<{ trackingId: string }>("/appointments/book", {
        method: "POST",
        json: {
          scheduledAt: scheduledAt.toISOString(),
          contactName: String(fd.get("contactName")).trim(),
          contactEmail: String(fd.get("contactEmail")).trim(),
          contactPhone: String(fd.get("contactPhone")).trim(),
          notes: String(fd.get("notes") || ""),
          damageAnalysisId: analysisId,
          make: String(fd.get("make") || "").trim() || undefined,
          model: String(fd.get("model") || "").trim() || undefined,
          year,
        },
      });
      setDone({ trackingId: res.trackingId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="feature-panel space-y-4 rounded-sm p-6 text-[var(--mist)]">
        <p className="text-sm uppercase tracking-[0.25em] text-[var(--copper-hot)]">Booked</p>
        <h2 className="font-display text-2xl font-bold">Appointment request received</h2>
        <p>
          Your tracking ID is{" "}
          <span className="font-mono text-lg font-semibold text-[var(--copper-hot)]">{done.trackingId}</span>
        </p>
        <p className="text-sm text-[var(--steel)]">
          Save this ID — use it on the Track page anytime. Confirmation email/SMS is queued.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href={`/track?id=${encodeURIComponent(done.trackingId)}`} className="btn-primary">
            Track repair
          </Link>
          <Link href="/" className="btn-ghost">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="feature-panel space-y-3 rounded-sm p-6">
      {(analysisId || reportId) && (
        <p className="text-xs text-[var(--steel)]">
          Linked AI report{reportId ? `: ${reportId}` : ""} — booking marks your lead as inspection
          scheduled.
        </p>
      )}
      <input
        name="contactName"
        required
        placeholder="Full name"
        className="field"
        defaultValue={params.get("name") ?? ""}
      />
      <input
        name="contactEmail"
        type="email"
        required
        placeholder="Email"
        className="field"
        defaultValue={params.get("email") ?? ""}
      />
      <input
        name="contactPhone"
        required
        minLength={7}
        placeholder="Phone"
        className="field"
        defaultValue={params.get("phone") ?? ""}
      />
      <input name="scheduledAt" type="datetime-local" required className="field" />
      <div className="grid gap-3 md:grid-cols-3">
        <input name="make" placeholder="Make" className="field" defaultValue={params.get("make") ?? ""} />
        <input name="model" placeholder="Model" className="field" defaultValue={params.get("model") ?? ""} />
        <input
          name="year"
          type="number"
          min={1980}
          max={2100}
          placeholder="Year"
          className="field"
          defaultValue={params.get("year") ?? ""}
        />
      </div>
      <textarea name="notes" placeholder="Notes" className="field" rows={3} />
      <button className="btn-primary" disabled={loading}>
        {loading ? "Booking…" : "Request Inspection"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

export default function BookPage() {
  return (
    <div className="site-light section-ambient">
      <div className="relative mx-auto max-w-xl px-4 py-14 sm:px-6">
        <div className="surface mb-8 rounded-xl p-6 md:p-8">
          <p className="eyebrow">Cars Compound</p>
          <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight">Book an Inspection</h1>
          <p className="mt-3 text-[var(--muted)]">
            Physical estimate at Cars Compound — AI never replaces the bay.
          </p>
        </div>
        <div>
          <Suspense fallback={<p className="text-[var(--muted)]">Loading…</p>}>
            <BookForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
