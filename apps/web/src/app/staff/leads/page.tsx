"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Lead = {
  id: string;
  status: string;
  source: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
  appointmentId?: string | null;
  damageAnalysis?: { reportId: string; id: string; status: string; pricedJson?: any };
};

export default function StaffLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await api<{ items: Lead[] } | Lead[]>("/leads");
    setLeads(Array.isArray(res) ? res : res.items);
  }

  useEffect(() => {
    refresh().catch(() => setError("Staff login required."));
  }, []);

  async function setStatus(id: string, status: string) {
    setMessage(null);
    try {
      await api(`/leads/${id}`, { method: "PATCH", json: { status } });
      setMessage(`Lead updated → ${status}`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function saveNotes(id: string, notes: string) {
    setMessage(null);
    try {
      await api(`/leads/${id}`, { method: "PATCH", json: { notes } });
      setMessage("Notes saved");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <p>{error}</p>
        <Link href="/login" className="text-[var(--copper-hot)]">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">CRM</p>
      <h1 className="font-display mt-2 text-4xl font-extrabold">AI Leads</h1>
      <p className="mt-2 text-sm text-[var(--steel)]">
        Workflow: NEW → CONTACTED → INSPECTION_SCHEDULED → CONVERTED (or LOST)
      </p>
      <div className="mt-4 flex gap-3 text-sm">
        <Link href="/staff" className="text-[var(--copper-hot)]">
          ← Ops dashboard
        </Link>
        <Link href="/staff/intake" className="text-[var(--copper-hot)]">
          Repair intake →
        </Link>
        <Link href="/staff/settings" className="text-[var(--copper-hot)]">
          Price bands →
        </Link>
      </div>
      {message && <p className="mt-4 text-sm text-[var(--steel)]">{message}</p>}

      <div className="mt-8 space-y-3">
        {leads.map((lead) => {
          const priced = lead.damageAnalysis?.pricedJson;
          return (
            <div key={lead.id} className="panel rounded-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-semibold">{lead.contactName}</div>
                  <div className="text-sm text-[var(--steel)]">
                    {lead.contactEmail} · {lead.contactPhone}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-[var(--copper-hot)]">
                    {lead.status} · {lead.source}
                    {lead.damageAnalysis?.reportId ? ` · ${lead.damageAnalysis.reportId}` : ""}
                  </div>
                  {priced && (
                    <div className="mt-2 text-sm">
                      Advisory: {priced.currency} {Number(priced.costMin).toLocaleString()}–
                      {Number(priced.costMax).toLocaleString()} · {priced.durationDaysMin}–
                      {priced.durationDaysMax} days
                    </div>
                  )}
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      void saveNotes(lead.id, String(fd.get("notes") || ""));
                    }}
                  >
                    <input
                      name="notes"
                      defaultValue={lead.notes ?? ""}
                      placeholder="Internal notes"
                      className="field flex-1 text-sm"
                    />
                    <button type="submit" className="btn-ghost px-3 py-1 text-xs">
                      Save
                    </button>
                  </form>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["CONTACTED", "INSPECTION_SCHEDULED", "CONVERTED", "LOST"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(lead.id, s)}
                      className="rounded-sm border border-[var(--line)] px-2 py-1 text-xs hover:border-[var(--copper)]"
                    >
                      {s}
                    </button>
                  ))}
                  {lead.damageAnalysis?.reportId && (
                    <a
                      href={`/api/v1/ai/reports/${lead.damageAnalysis.reportId}/html`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-sm bg-[var(--copper)] px-2 py-1 text-xs text-white"
                    >
                      Report
                    </a>
                  )}
                  {lead.damageAnalysis?.id && (
                    <Link
                      href={`/book?analysisId=${lead.damageAnalysis.id}&reportId=${lead.damageAnalysis.reportId ?? ""}&name=${encodeURIComponent(lead.contactName)}&email=${encodeURIComponent(lead.contactEmail)}&phone=${encodeURIComponent(lead.contactPhone)}`}
                      className="rounded-sm border border-[var(--line)] px-2 py-1 text-xs"
                    >
                      Book link
                    </Link>
                  )}
                  <Link
                    href={`/staff/intake${lead.appointmentId ? `?appointmentId=${lead.appointmentId}` : ""}`}
                    className="rounded-sm border border-[var(--line)] px-2 py-1 text-xs"
                  >
                    Intake
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        {!leads.length && <p className="text-sm text-[var(--steel)]">No AI leads yet.</p>}
      </div>
    </div>
  );
}
