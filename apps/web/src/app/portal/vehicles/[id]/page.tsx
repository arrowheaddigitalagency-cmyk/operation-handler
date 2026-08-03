"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function PortalVehiclePage() {
  const params = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api(`/vehicles/${params.id}`)
      .then(setVehicle)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [params.id]);

  if (error) return <div className="p-8 text-red-400">{error}</div>;
  if (!vehicle) return <div className="p-8 text-[var(--steel)]">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Link href="/portal" className="text-sm text-[var(--copper-hot)]">
        ← Garage
      </Link>
      <h1 className="font-display mt-3 text-4xl font-extrabold">
        {vehicle.year} {vehicle.make} {vehicle.model}
      </h1>
      <p className="mt-2 text-sm text-[var(--steel)]">
        {[vehicle.vin && `VIN ${vehicle.vin}`, vehicle.paintCode && `Paint ${vehicle.paintCode}`, vehicle.mileage != null && `${vehicle.mileage} mi`]
          .filter(Boolean)
          .join(" · ") || "Digital vehicle record"}
      </p>

      <h2 className="font-display mt-10 text-xl font-semibold">Service history</h2>
      <div className="mt-4 space-y-2">
        {(vehicle.repairCases ?? []).map((r: any) => (
          <Link key={r.id} href={`/portal/repairs/${r.id}`} className="panel block rounded-sm p-4 text-sm">
            <div className="font-medium">{r.trackingId}</div>
            <div className="text-[var(--steel)]">
              {r.currentStage} · {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "In progress"}
            </div>
          </Link>
        ))}
        {!vehicle.repairCases?.length && <p className="text-sm text-[var(--steel)]">No repairs on file.</p>}
      </div>

      <h2 className="font-display mt-10 text-xl font-semibold">Maintenance reminders</h2>
      <div className="mt-4 space-y-2">
        {(vehicle.maintenanceReminders ?? []).map((m: any) => (
          <div key={m.id} className="panel rounded-sm p-4 text-sm">
            <div className="font-medium">{m.rule?.name ?? "Reminder"}</div>
            <div className="text-[var(--steel)]">
              {m.status}
              {m.dueAt ? ` · due ${new Date(m.dueAt).toLocaleDateString()}` : ""}
            </div>
          </div>
        ))}
        {!vehicle.maintenanceReminders?.length && (
          <p className="text-sm text-[var(--steel)]">No scheduled reminders yet.</p>
        )}
      </div>
    </div>
  );
}
