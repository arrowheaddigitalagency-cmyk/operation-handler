"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Row = {
  id: string;
  status: string;
  vin: string | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  samplePricing: boolean;
  createdAt: string;
  customerEmail: string | null;
};

export default function StaffDamageEstimatesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Row[]>("/damage-estimate/admin/sessions")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--mist)]">Damage estimates</h2>
          <p className="text-sm text-[var(--steel)]">CCC-style sessions from /damage-estimate</p>
        </div>
        <Link href="/staff/damage-estimates/rates" className="text-sm text-[var(--copper-hot)]">
          Labor / paint rates →
        </Link>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="overflow-x-auto rounded-sm border border-[var(--line)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-black/30 text-[var(--steel)]">
            <tr>
              <th className="p-3">Created</th>
              <th className="p-3">VIN</th>
              <th className="p-3">Status</th>
              <th className="p-3">Range</th>
              <th className="p-3">Customer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--line)]">
                <td className="p-3 text-[var(--steel)]">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-3 font-mono text-xs">{r.vin ?? "—"}</td>
                <td className="p-3">
                  {r.status}
                  {r.samplePricing ? (
                    <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">
                      Sample
                    </span>
                  ) : null}
                </td>
                <td className="p-3">
                  {r.rangeLow != null && r.rangeHigh != null
                    ? `$${r.rangeLow.toFixed(0)}–$${r.rangeHigh.toFixed(0)}`
                    : "—"}
                </td>
                <td className="p-3 text-[var(--steel)]">{r.customerEmail ?? "—"}</td>
              </tr>
            ))}
            {!rows.length && !error && (
              <tr>
                <td className="p-4 text-[var(--steel)]" colSpan={5}>
                  No estimate sessions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
