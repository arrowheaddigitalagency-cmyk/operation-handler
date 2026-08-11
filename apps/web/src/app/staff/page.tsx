"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { REPAIR_STAGE_ORDER, REPAIR_STAGE_LABELS } from "@cc/domain";

type Ops = {
  openRepairs: number;
  readyForPickup: number;
  deliveredThisMonth: number;
  pendingAppointments: number;
  pendingNotifications?: number;
  byStage?: Array<{ currentStage: string; _count: number }>;
};

type Repair = {
  id: string;
  trackingId: string;
  currentStage: string;
  progressPercent?: number;
  updatedAt?: string;
  vehicle?: { year?: number; make?: string; model?: string };
  customer?: { user?: { firstName?: string; lastName?: string; email?: string; phone?: string } };
};

type Appointment = {
  id: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  scheduledAt: string;
  status: string;
  vehicle?: { year?: number; make?: string; model?: string } | null;
  repairCase?: { trackingId?: string; currentStage?: string } | null;
};

type Lead = {
  id: string;
  status: string;
  contactName: string;
  source: string;
  createdAt?: string;
  damageAnalysis?: { reportId?: string };
};

function stageLabel(stage: string) {
  return REPAIR_STAGE_LABELS[stage as keyof typeof REPAIR_STAGE_LABELS] ?? stage.replaceAll("_", " ");
}

function vehicleLabel(v?: { year?: number; make?: string; model?: string } | null) {
  if (!v) return "Vehicle TBD";
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle TBD";
}

export default function StaffPage() {
  const [ops, setOps] = useState<Ops | null>(null);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [stage, setStage] = useState(REPAIR_STAGE_ORDER[1]);
  const [stageNotes, setStageNotes] = useState("");
  const [visibleToCustomer, setVisibleToCustomer] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [o, r, a, l] = await Promise.all([
      api<Ops>("/reports/ops"),
      api<Repair[]>("/repairs"),
      api<Appointment[]>("/appointments"),
      api<{ items: Lead[] } | Lead[]>("/leads").catch(() => [] as Lead[]),
    ]);
    setOps(o);
    setRepairs(r);
    setAppointments(a);
    setLeads(Array.isArray(l) ? l : l.items);
    if (!selected && r[0]) setSelected(r[0].id);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => setError("Staff login required."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRepair = useMemo(
    () => repairs.find((r) => r.id === selected) ?? null,
    [repairs, selected],
  );

  const filteredRepairs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repairs;
    return repairs.filter((r) => {
      const hay = [
        r.trackingId,
        r.currentStage,
        vehicleLabel(r.vehicle),
        r.customer?.user?.firstName,
        r.customer?.user?.lastName,
        r.customer?.user?.email,
        r.customer?.user?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [repairs, query]);

  const newLeads = leads.filter((l) => l.status === "NEW" || l.status === "CONTACTED").length;

  async function advanceStage() {
    if (!selected) return;
    setMessage(null);
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="staff-ops-panel staff-ops-empty">
        <p>{error}</p>
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="staff-ops-page">
      <header className="staff-ops-top">
        <div>
          <p className="staff-ops-kicker">Operations</p>
          <h2 className="staff-ops-heading">Bay &amp; pipeline control</h2>
          <p className="staff-ops-sub">
            Live repairs, inspection queue, and AI leads — one console for the shop floor.
          </p>
        </div>
        <div className="staff-ops-top-actions">
          <button type="button" className="btn-ghost" disabled={loading} onClick={() => void refresh()}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <Link href="/staff/intake" className="btn-primary">
            New intake
          </Link>
        </div>
      </header>

      <section className="staff-kpi-grid">
        {[
          { label: "Open repairs", value: ops?.openRepairs ?? "—", tone: "" },
          { label: "Ready for pickup", value: ops?.readyForPickup ?? "—", tone: "is-hot" },
          { label: "Delivered (month)", value: ops?.deliveredThisMonth ?? "—", tone: "" },
          { label: "Pending inspections", value: ops?.pendingAppointments ?? "—", tone: "" },
          { label: "Active leads", value: newLeads || leads.length || "—", tone: "is-accent" },
          { label: "Queued notices", value: ops?.pendingNotifications ?? "—", tone: "" },
        ].map((kpi) => (
          <div key={kpi.label} className={`staff-kpi ${kpi.tone}`}>
            <div className="staff-kpi-label">{kpi.label}</div>
            <div className="staff-kpi-value">{kpi.value}</div>
          </div>
        ))}
      </section>

      <section className="staff-ops-grid">
        <div className="staff-ops-panel staff-ops-panel-tall">
          <div className="staff-ops-panel-head">
            <div>
              <h3>Repair board</h3>
              <p>{filteredRepairs.length} cases</p>
            </div>
            <input
              className="field staff-ops-search"
              placeholder="Search tracking, vehicle, customer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="staff-repair-list">
            {filteredRepairs.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelected(r.id);
                  setStage(
                    (REPAIR_STAGE_ORDER.includes(r.currentStage as never)
                      ? r.currentStage
                      : REPAIR_STAGE_ORDER[1]) as (typeof REPAIR_STAGE_ORDER)[number],
                  );
                }}
                className={`staff-repair-row ${selected === r.id ? "is-active" : ""}`}
              >
                <div className="staff-repair-row-main">
                  <span className="staff-tracking">{r.trackingId}</span>
                  <span className="staff-vehicle">{vehicleLabel(r.vehicle)}</span>
                </div>
                <div className="staff-repair-row-meta">
                  <span className="staff-stage-pill">{stageLabel(r.currentStage)}</span>
                  <span className="staff-progress">{r.progressPercent ?? 0}%</span>
                </div>
                <div className="staff-progress-bar" aria-hidden>
                  <span style={{ width: `${Math.min(100, r.progressPercent ?? 0)}%` }} />
                </div>
              </button>
            ))}
            {!filteredRepairs.length && (
              <p className="staff-ops-muted">No repair cases match this search.</p>
            )}
          </div>
        </div>

        <div className="staff-ops-stack">
          <div className="staff-ops-panel">
            <div className="staff-ops-panel-head">
              <div>
                <h3>Stage control</h3>
                <p>{selectedRepair ? selectedRepair.trackingId : "Select a repair"}</p>
              </div>
            </div>

            {selectedRepair ? (
              <>
                <div className="staff-case-summary">
                  <div>
                    <div className="staff-vehicle">{vehicleLabel(selectedRepair.vehicle)}</div>
                    <div className="staff-ops-muted">
                      {[
                        selectedRepair.customer?.user?.firstName,
                        selectedRepair.customer?.user?.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ") || "Customer"}
                      {selectedRepair.customer?.user?.phone
                        ? ` · ${selectedRepair.customer.user.phone}`
                        : ""}
                    </div>
                  </div>
                  <Link
                    href={`/track?id=${encodeURIComponent(selectedRepair.trackingId)}`}
                    className="staff-link"
                    target="_blank"
                  >
                    Open track view
                  </Link>
                </div>

                <div className="staff-stage-rail" aria-hidden>
                  {REPAIR_STAGE_ORDER.slice(0, 8).map((s, idx) => {
                    const currentIdx = Math.max(
                      0,
                      REPAIR_STAGE_ORDER.indexOf(selectedRepair.currentStage as never),
                    );
                    return (
                      <span
                        key={s}
                        className={`staff-stage-dot ${idx <= currentIdx ? "is-on" : ""}`}
                        title={stageLabel(s)}
                      />
                    );
                  })}
                </div>

                <div className="staff-stage-form">
                  <label className="staff-label">
                    Move to stage
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
                  </label>
                  <label className="staff-label">
                    Update notes
                    <textarea
                      value={stageNotes}
                      onChange={(e) => setStageNotes(e.target.value)}
                      placeholder="Customer-visible update (optional)"
                      className="field"
                      rows={3}
                    />
                  </label>
                  <label className="staff-check">
                    <input
                      type="checkbox"
                      checked={visibleToCustomer}
                      onChange={(e) => setVisibleToCustomer(e.target.checked)}
                    />
                    Show notes on customer track / portal
                  </label>
                  <button
                    type="button"
                    className="btn-primary w-full"
                    disabled={saving}
                    onClick={() => void advanceStage()}
                  >
                    {saving ? "Updating…" : "Apply stage change"}
                  </button>
                  {message && <p className="staff-ops-msg">{message}</p>}
                </div>
              </>
            ) : (
              <p className="staff-ops-muted">Select a repair from the board to update its stage.</p>
            )}
          </div>

          <div className="staff-ops-panel">
            <div className="staff-ops-panel-head">
              <div>
                <h3>Inspection queue</h3>
                <p>Upcoming / requested appointments</p>
              </div>
              <Link href="/staff/intake" className="staff-link">
                Intake →
              </Link>
            </div>
            <div className="staff-appt-list">
              {appointments.slice(0, 6).map((a) => (
                <div key={a.id} className="staff-appt-row">
                  <div>
                    <div className="staff-appt-name">{a.contactName || "Guest"}</div>
                    <div className="staff-ops-muted">
                      {new Date(a.scheduledAt).toLocaleString()} · {a.status}
                    </div>
                    <div className="staff-ops-muted">{vehicleLabel(a.vehicle)}</div>
                  </div>
                  <div className="staff-appt-right">
                    {a.repairCase?.trackingId ? (
                      <span className="staff-tracking">{a.repairCase.trackingId}</span>
                    ) : (
                      <Link href={`/staff/intake?appointmentId=${a.id}`} className="staff-link">
                        Open intake
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {!appointments.length && <p className="staff-ops-muted">No appointments yet.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="staff-ops-panel staff-leads-strip">
        <div className="staff-ops-panel-head">
          <div>
            <h3>AI &amp; web leads</h3>
            <p>Newest CRM activity from Assess / Book</p>
          </div>
          <Link href="/staff/leads" className="staff-link">
            Open CRM →
          </Link>
        </div>
        <div className="staff-lead-grid">
          {leads.slice(0, 6).map((lead) => (
            <div key={lead.id} className="staff-lead-card">
              <div className="staff-lead-name">{lead.contactName}</div>
              <div className="staff-stage-pill">{lead.status}</div>
              <div className="staff-ops-muted">
                {lead.source}
                {lead.damageAnalysis?.reportId ? ` · ${lead.damageAnalysis.reportId}` : ""}
              </div>
            </div>
          ))}
          {!leads.length && <p className="staff-ops-muted">No leads yet — run an AI assess on the site.</p>}
        </div>
      </section>
    </div>
  );
}
