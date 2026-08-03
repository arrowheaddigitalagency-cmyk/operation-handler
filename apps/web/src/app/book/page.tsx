"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";

function BookForm() {
  const params = useSearchParams();
  const analysisId = params.get("analysisId") ?? undefined;
  const reportId = params.get("reportId") ?? undefined;
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/appointments/book", {
        method: "POST",
        json: {
          scheduledAt: new Date(String(fd.get("scheduledAt"))).toISOString(),
          contactName: String(fd.get("contactName")),
          contactEmail: String(fd.get("contactEmail")),
          contactPhone: String(fd.get("contactPhone")),
          notes: String(fd.get("notes") || ""),
          damageAnalysisId: analysisId,
          make: String(fd.get("make") || "") || undefined,
          model: String(fd.get("model") || "") || undefined,
          year: fd.get("year") ? Number(fd.get("year")) : undefined,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    }
  }

  if (done) {
    return (
      <p className="panel rounded-sm p-6 text-[var(--mist)]">
        Appointment request received at Cars Compound. Confirmation email/SMS is queued. Our team will
        follow up from the CRM lead board.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-3 rounded-sm p-6">
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
          placeholder="Year"
          className="field"
          defaultValue={params.get("year") ?? ""}
        />
      </div>
      <textarea name="notes" placeholder="Notes" className="field" rows={3} />
      <button className="btn-primary">Request Inspection</button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

export default function BookPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">
        Cars Compound
      </p>
      <h1 className="font-display mt-2 text-4xl font-extrabold">Book an Inspection</h1>
      <p className="mt-2 text-[var(--steel)]">Physical estimate at Cars Compound — AI never replaces the bay.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-[var(--steel)]">Loading…</p>}>
          <BookForm />
        </Suspense>
      </div>
    </div>
  );
}
