"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { REPAIR_STAGE_ORDER, REPAIR_STAGE_LABELS } from "@cc/domain";

export default function StaffPage() {
  const [ops, setOps] = useState<any>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [stage, setStage] = useState(REPAIR_STAGE_ORDER[1]);
  const [stageNotes, setStageNotes] = useState("");
  const [visibleToCustomer, setVisibleToCustomer] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [o, r, a] = await Promise.all([
      api("/reports/ops"),
      api<any[]>("/repairs"),
      api<any[]>("/appointments"),
    ]);
    setOps(o);
    setRepairs(r);
    setAppointments(a);
  }

  useEffect(() => {
    refresh().catch(() => setError("Staff login required."));
  }, []);

  async function advanceStage() {
    if (!selected) return;
    setMessage(null);
    try {
      await api(`/repairs/${selected}/stage`, {
        method: "POST",
        json: {
          toStage: stage,
          notes: stageNotes || "Updated from staff dashboard",
          visibleToCustomer,
        },
      });
      setMessage("Stage updated — customer notification queued.");
      setStageNotes("");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <p className="text-[var(--steel)]">{error}</p>
        <Link href="/login" className="text-[var(--copper-hot)]">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound Ops</p>
      <h1 className="font-display mt-2 text-4xl font-extrabold">Staff Dashboard</h1>

      {ops && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Open repairs", ops.openRepairs],
            ["Ready for pickup", ops.readyForPickup],
            ["Delivered this month", ops.deliveredThisMonth],
            ["Pending appointments", ops.pendingAppointments],
          ].map(([label, value]) => (
            <div key={String(label)} className="panel rounded-sm p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--steel)]">{label}</div>
              <div className="font-display mt-1 text-3xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      )}

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-semibold">Repair cases</h2>
          <div className="mt-4 max-h-96 space-y-2 overflow-auto">
            {repairs.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r.id)}
                className={`block w-full rounded-sm border p-3 text-left text-sm transition ${
                  selected === r.id
                    ? "border-[var(--copper)] bg-[color-mix(in_srgb,var(--copper)_12%,transparent)]"
                    : "border-[var(--line)] bg-[var(--panel)]"
                }`}
              >
                <div className="font-medium">
                  {r.vehicle?.year} {r.vehicle?.make} {r.vehicle?.model}
                </div>
                <div className="text-[var(--steel)]">
                  {r.trackingId} · {r.currentStage}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold">Update stage</h2>
          <div className="panel mt-4 space-y-3 rounded-sm p-4">
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as typeof stage)}
              className="field"
            >
              {REPAIR_STAGE_ORDER.map((s) => (
                <option key={s} value={s} className="bg-[var(--panel)]">
                  {REPAIR_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            <textarea
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              placeholder="Customer-visible update notes (optional)"
              className="field"
              rows={2}
            />
            <label className="flex items-center gap-2 text-xs text-[var(--steel)]">
              <input
                type="checkbox"
                checked={visibleToCustomer}
                onChange={(e) => setVisibleToCustomer(e.target.checked)}
              />
              Show notes to customer
            </label>
            <button type="button" disabled={!selected} onClick={advanceStage} className="btn-primary disabled:opacity-40">
              Apply stage change
            </button>
            {message && <p className="text-sm text-[var(--steel)]">{message}</p>}
            <Link href="/staff/leads" className="block text-sm text-[var(--copper-hot)]">
              AI Leads CRM →
            </Link>
            <Link href="/staff/settings" className="block text-sm text-[var(--copper-hot)]">
              Shop &amp; price bands →
            </Link>
            <Link href="/staff/intake" className="block text-sm text-[var(--copper-hot)]">
              Create repair intake →
            </Link>
          </div>

          <h2 className="font-display mt-8 text-xl font-semibold">Appointments</h2>
          <div className="mt-4 space-y-2">
            {appointments.slice(0, 8).map((a) => (
              <div key={a.id} className="panel rounded-sm p-3 text-sm">
                <div className="font-medium">{a.contactName}</div>
                <div className="text-[var(--steel)]">
                  {new Date(a.scheduledAt).toLocaleString()} · {a.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
