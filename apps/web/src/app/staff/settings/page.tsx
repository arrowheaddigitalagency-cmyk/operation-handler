"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Band = {
  id: string;
  partKey: string;
  partLabel: string;
  severity: string;
  costMin: number;
  costMax: number;
  durationDaysMin: number;
  durationDaysMax: number;
  active: boolean;
};

type Shop = {
  shopName: string;
  portalCredit: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  reportFooter?: string | null;
};

export default function StaffSettingsPage() {
  const [bands, setBands] = useState<Band[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [s, b] = await Promise.all([
      api<Shop>("/settings/shop"),
      api<Band[]>("/settings/price-bands"),
    ]);
    setShop(s);
    setBands(b);
  }

  useEffect(() => {
    refresh().catch(() => setError("Admin/manager login required."));
  }, []);

  async function saveShop(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMessage(null);
    try {
      await api("/settings/shop", {
        method: "PATCH",
        json: {
          shopName: String(fd.get("shopName")),
          portalCredit: String(fd.get("portalCredit")),
          supportEmail: String(fd.get("supportEmail") || "") || undefined,
          supportPhone: String(fd.get("supportPhone") || "") || undefined,
          reportFooter: String(fd.get("reportFooter") || "") || undefined,
        },
      });
      setMessage("Shop settings saved.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function saveBand(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMessage(null);
    try {
      await api(`/settings/price-bands/${id}`, {
        method: "PATCH",
        json: {
          costMin: Number(fd.get("costMin")),
          costMax: Number(fd.get("costMax")),
          durationDaysMin: Number(fd.get("durationDaysMin")),
          durationDaysMax: Number(fd.get("durationDaysMax")),
          active: fd.get("active") === "on",
        },
      });
      setMessage("Price band updated.");
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
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Admin</p>
      <h1 className="font-display mt-2 text-4xl font-extrabold">Shop &amp; Price Bands</h1>
      <p className="mt-2 text-sm text-[var(--steel)]">
        AI detects damage only. Advisory dollars come from these configurable Cars Compound bands.
      </p>
      <Link href="/staff" className="mt-4 inline-block text-sm text-[var(--copper-hot)]">
        ← Ops dashboard
      </Link>
      {message && <p className="mt-4 text-sm text-[var(--steel)]">{message}</p>}

      {shop && (
        <form onSubmit={saveShop} className="panel mt-8 space-y-3 rounded-sm p-6">
          <h2 className="font-display text-xl font-semibold">Shop branding</h2>
          <input name="shopName" defaultValue={shop.shopName} className="field" placeholder="Shop name" />
          <input
            name="portalCredit"
            defaultValue={shop.portalCredit}
            className="field"
            placeholder="Portal by Arrowhead"
          />
          <input
            name="supportEmail"
            defaultValue={shop.supportEmail ?? ""}
            className="field"
            placeholder="Support email"
          />
          <input
            name="supportPhone"
            defaultValue={shop.supportPhone ?? ""}
            className="field"
            placeholder="Support phone"
          />
          <textarea
            name="reportFooter"
            defaultValue={shop.reportFooter ?? ""}
            className="field"
            rows={3}
            placeholder="Report footer / disclaimer"
          />
          <button className="btn-primary">Save shop settings</button>
        </form>
      )}

      <div className="mt-10 space-y-3">
        <h2 className="font-display text-xl font-semibold">Repair price bands</h2>
        {bands.map((b) => (
          <form
            key={b.id}
            onSubmit={(e) => saveBand(b.id, e)}
            className="panel grid gap-2 rounded-sm p-4 md:grid-cols-6 md:items-end"
          >
            <div className="md:col-span-2">
              <div className="text-sm font-medium">
                {b.partLabel} · {b.severity}
              </div>
              <div className="text-xs text-[var(--steel)]">{b.partKey}</div>
            </div>
            <label className="text-xs text-[var(--steel)]">
              Cost min
              <input name="costMin" type="number" defaultValue={b.costMin} className="field mt-1" />
            </label>
            <label className="text-xs text-[var(--steel)]">
              Cost max
              <input name="costMax" type="number" defaultValue={b.costMax} className="field mt-1" />
            </label>
            <label className="text-xs text-[var(--steel)]">
              Days min
              <input
                name="durationDaysMin"
                type="number"
                defaultValue={b.durationDaysMin}
                className="field mt-1"
              />
            </label>
            <label className="text-xs text-[var(--steel)]">
              Days max
              <input
                name="durationDaysMax"
                type="number"
                defaultValue={b.durationDaysMax}
                className="field mt-1"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--steel)] md:col-span-2">
              <input name="active" type="checkbox" defaultChecked={b.active} /> Active
            </label>
            <button className="btn-ghost md:col-span-4">Update band</button>
          </form>
        ))}
        {!bands.length && <p className="text-sm text-[var(--steel)]">No bands seeded yet.</p>}
      </div>
    </div>
  );
}
