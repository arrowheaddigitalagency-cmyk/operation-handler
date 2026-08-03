"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, logout } from "@/lib/api";

type Repair = {
  id: string;
  trackingId: string;
  currentStage: string;
  progressPercent: number;
  vehicleId?: string;
  vehicle: { id?: string; make: string; model: string; year: number };
};

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
};

type Appointment = {
  id: string;
  scheduledAt: string;
  status: string;
  vehicle?: { year: number; make: string; model: string } | null;
};

type SupportTicket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  staffReply?: string | null;
};

export default function PortalPage() {
  const [me, setMe] = useState<{ firstName: string; lastName: string; email: string } | null>(null);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [supportMsg, setSupportMsg] = useState<string | null>(null);

  async function refresh() {
    const user = await api<{ firstName: string; lastName: string; email: string }>("/auth/me");
    setMe(user);
    const [r, v, a, s] = await Promise.all([
      api<Repair[]>("/repairs"),
      api<Vehicle[]>("/vehicles"),
      api<Appointment[]>("/appointments/mine").catch(() => [] as Appointment[]),
      api<SupportTicket[]>("/support").catch(() => [] as SupportTicket[]),
    ]);
    setRepairs(r);
    setVehicles(v);
    setAppointments(a);
    setTickets(s);
  }

  useEffect(() => {
    refresh().catch(() => setError("Please log in to view your portal."));
  }, []);

  const filteredRepairs = useMemo(() => {
    if (selectedVehicleId === "all") return repairs;
    return repairs.filter(
      (r) => r.vehicleId === selectedVehicleId || r.vehicle?.id === selectedVehicleId,
    );
  }, [repairs, selectedVehicleId]);

  async function onSupport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSupportMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/support", {
        method: "POST",
        json: {
          subject: String(fd.get("subject")),
          body: String(fd.get("body")),
          vehicleId: selectedVehicleId !== "all" ? selectedVehicleId : undefined,
        },
      });
      setSupportMsg("Support request sent.");
      e.currentTarget.reset();
      await refresh();
    } catch (err) {
      setSupportMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <p className="text-[var(--steel)]">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-[var(--copper-hot)]">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">
            Cars Compound
          </p>
          <h1 className="font-display mt-2 text-4xl font-extrabold">Your digital garage</h1>
          {me && (
            <p className="mt-2 text-[var(--steel)]">
              {me.firstName} {me.lastName} · {me.email}
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            await logout();
            window.location.href = "/login";
          }}
        >
          Sign out
        </button>
      </div>

      <div className="mt-8">
        <label className="text-xs uppercase tracking-wide text-[var(--steel)]">Vehicle filter</label>
        <select
          className="field mt-2 max-w-md"
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
        >
          <option value="all">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id} className="bg-[var(--panel)]">
              {v.year} {v.make} {v.model}
            </option>
          ))}
        </select>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Vehicles</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/portal/vehicles/${v.id}`}
              className={`panel rounded-sm p-5 transition hover:border-[var(--copper)] ${
                selectedVehicleId === v.id ? "border-[var(--copper)]" : ""
              }`}
            >
              <div className="font-display text-lg font-semibold">
                {v.year} {v.make} {v.model}
              </div>
              <div className="mt-1 text-xs text-[var(--steel)]">History · maintenance · documents</div>
            </Link>
          ))}
          {!vehicles.length && <p className="text-sm text-[var(--steel)]">No vehicles yet.</p>}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Active & past repairs</h2>
        <div className="mt-4 space-y-3">
          {filteredRepairs.map((r) => (
            <Link
              key={r.id}
              href={`/portal/repairs/${r.id}`}
              className="panel block rounded-sm p-5 transition hover:border-[var(--copper)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-display font-semibold">
                    {r.vehicle.year} {r.vehicle.make} {r.vehicle.model}
                  </div>
                  <div className="text-sm text-[var(--steel)]">{r.trackingId}</div>
                </div>
                <div className="text-right text-sm">
                  <div>{r.currentStage}</div>
                  <div className="text-[var(--copper-hot)]">{r.progressPercent}%</div>
                </div>
              </div>
            </Link>
          ))}
          {!filteredRepairs.length && <p className="text-sm text-[var(--steel)]">No repair cases yet.</p>}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Appointments</h2>
        <div className="mt-4 space-y-2">
          {appointments.map((a) => (
            <div key={a.id} className="panel rounded-sm p-4 text-sm">
              <div className="font-medium">{new Date(a.scheduledAt).toLocaleString()}</div>
              <div className="text-[var(--steel)]">
                {a.status}
                {a.vehicle ? ` · ${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}` : ""}
              </div>
            </div>
          ))}
          {!appointments.length && (
            <p className="text-sm text-[var(--steel)]">
              No appointments yet.{" "}
              <Link href="/book" className="text-[var(--copper-hot)]">
                Book inspection
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-semibold">Support</h2>
          <form onSubmit={onSupport} className="panel mt-4 space-y-3 rounded-sm p-4">
            <input name="subject" required placeholder="Subject" className="field" />
            <textarea name="body" required rows={3} placeholder="How can we help?" className="field" />
            <button className="btn-primary">Send request</button>
            {supportMsg && <p className="text-sm text-[var(--steel)]">{supportMsg}</p>}
          </form>
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Your tickets</h2>
          <div className="mt-4 space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="panel rounded-sm p-4 text-sm">
                <div className="font-medium">{t.subject}</div>
                <div className="text-[var(--steel)]">
                  {t.status} · {new Date(t.createdAt).toLocaleDateString()}
                </div>
                {t.staffReply && <p className="mt-2 text-[var(--mist)]">{t.staffReply}</p>}
              </div>
            ))}
            {!tickets.length && <p className="text-sm text-[var(--steel)]">No support tickets yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
