"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Rates = {
  bodyRatePerHour: number;
  paintRatePerHour: number;
  mechanicalRatePerHour: number;
  frameRatePerHour: number;
  paintMaterialPerRefinishHour: number;
  triCoatMultiplier: number;
  blendMultiplier: number;
  taxRate: number;
  markupPercent: number;
  currency: string;
};

export default function StaffEstimateRatesPage() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<Rates>("/damage-estimate/admin/rates").then(setRates).catch((e) => setMsg(String(e)));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!rates) return;
    setMsg(null);
    try {
      const saved = await api<Rates>("/damage-estimate/admin/rates", { method: "PATCH", json: rates });
      setRates(saved);
      setMsg("Saved");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (!rates) return <p className="text-sm text-[var(--steel)]">Loading rates…</p>;

  const fields: { key: keyof Rates; label: string; step?: string }[] = [
    { key: "bodyRatePerHour", label: "Body $/hr" },
    { key: "paintRatePerHour", label: "Paint $/hr" },
    { key: "mechanicalRatePerHour", label: "Mechanical $/hr" },
    { key: "frameRatePerHour", label: "Frame $/hr" },
    { key: "paintMaterialPerRefinishHour", label: "Paint material $/refinish hr" },
    { key: "triCoatMultiplier", label: "Tri-coat multiplier", step: "0.01" },
    { key: "blendMultiplier", label: "Blend multiplier", step: "0.01" },
    { key: "taxRate", label: "Tax rate (0.07 = 7%)", step: "0.001" },
    { key: "markupPercent", label: "Markup %" },
  ];

  return (
    <form className="max-w-lg space-y-3" onSubmit={save}>
      <h2 className="text-xl font-semibold text-[var(--mist)]">Estimate labor & paint rates</h2>
      <p className="text-sm text-[var(--steel)]">Used by /damage-estimate pricing. No hardcoded shop rates in the UI.</p>
      {fields.map((f) => (
        <label key={f.key} className="block text-sm text-[var(--mist)]">
          {f.label}
          <input
            className="field mt-1"
            type="number"
            step={f.step ?? "0.01"}
            value={rates[f.key] as number}
            onChange={(e) => setRates({ ...rates, [f.key]: Number(e.target.value) })}
          />
        </label>
      ))}
      <button className="btn-primary" type="submit">
        Save rates
      </button>
      {msg && <p className="text-sm text-[var(--steel)]">{msg}</p>}
    </form>
  );
}
