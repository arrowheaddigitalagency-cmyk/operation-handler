"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

function IntakeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [appointmentId, setAppointmentId] = useState(params.get("appointmentId") ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ items: any[] }>("/customers"),
      api<any[]>("/appointments"),
    ])
      .then(([c, a]) => {
        setCustomers(c.items);
        const open = a.filter((x) => x.status === "REQUESTED" || x.status === "CONFIRMED");
        setAppointments(open);
        const pre = params.get("appointmentId");
        if (pre) {
          const appt = open.find((x) => x.id === pre);
          if (appt?.customerId) setCustomerId(appt.customerId);
        }
      })
      .catch(() => setError("Staff access required"));
  }, [params]);

  useEffect(() => {
    if (!customerId) return;
    api<any[]>(`/vehicles?customerId=${customerId}`).then(setVehicles).catch(() => setVehicles([]));
  }, [customerId]);

  function onPickAppointment(id: string) {
    setAppointmentId(id);
    const appt = appointments.find((a) => a.id === id);
    if (appt?.customerId) setCustomerId(appt.customerId);
    if (appt?.vehicleId) {
      // vehicle select will refresh via customerId
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const repair = await api<{ id: string; trackingId: string }>("/repairs/intake", {
        method: "POST",
        json: {
          customerId: String(fd.get("customerId")),
          vehicleId: String(fd.get("vehicleId")),
          appointmentId: appointmentId || undefined,
          insuranceApplicable: fd.get("insurance") === "on",
          insuranceCompany: String(fd.get("insuranceCompany") || "") || undefined,
          damageType: String(fd.get("damageType") || "") || undefined,
        },
      });
      alert(`Repair created. Tracking ID: ${repair.trackingId}\nCustomer notified by email/SMS.`);
      router.push("/staff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Intake failed");
    }
  }

  if (error && !customers.length) {
    return <div className="p-8 text-red-400">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound</p>
      <h1 className="font-display mt-2 text-4xl font-extrabold">Repair Intake</h1>
      <p className="mt-2 text-sm text-[var(--steel)]">
        Lead → inspection appointment → intake creates secure Tracking ID (CC-XXXXXX) and notifies the customer.
      </p>
      <div className="mt-3 flex gap-3 text-sm">
        <Link href="/staff/leads" className="text-[var(--copper-hot)]">
          ← AI Leads
        </Link>
        <Link href="/staff" className="text-[var(--copper-hot)]">
          Ops dashboard
        </Link>
      </div>
      <form onSubmit={onSubmit} className="panel mt-8 space-y-3 rounded-sm p-6">
        <select
          value={appointmentId}
          onChange={(e) => onPickAppointment(e.target.value)}
          className="field"
        >
          <option value="">Optional: link appointment / AI lead visit</option>
          {appointments.map((a) => (
            <option key={a.id} value={a.id} className="bg-[var(--panel)]">
              {a.contactName} · {new Date(a.scheduledAt).toLocaleString()}
              {a.repairCase?.trackingId ? ` · ${a.repairCase.trackingId}` : ""}
            </option>
          ))}
        </select>
        <select
          name="customerId"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="field"
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id} className="bg-[var(--panel)]">
              {c.user.firstName} {c.user.lastName} ({c.user.email})
            </option>
          ))}
        </select>
        <select
          name="vehicleId"
          required
          className="field"
          defaultValue={appointments.find((a) => a.id === appointmentId)?.vehicleId ?? ""}
          key={`${customerId}-${appointmentId}-${vehicles.length}`}
        >
          <option value="">Select vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id} className="bg-[var(--panel)]">
              {v.year} {v.make} {v.model}
            </option>
          ))}
        </select>
        <input name="damageType" placeholder="Damage type" className="field" />
        <label className="flex items-center gap-2 text-sm text-[var(--steel)]">
          <input name="insurance" type="checkbox" /> Insurance applicable
        </label>
        <input name="insuranceCompany" placeholder="Insurance company" className="field" />
        <button className="btn-primary">Create repair order + notify</button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--steel)]">Loading…</div>}>
      <IntakeForm />
    </Suspense>
  );
}
