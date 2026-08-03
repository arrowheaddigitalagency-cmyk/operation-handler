"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function PortalRepairPage() {
  const params = useParams<{ id: string }>();
  const [repair, setRepair] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api(`/repairs/${params.id}`)
      .then(setRepair)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [params.id]);

  async function downloadInvoice(id: string) {
    const payload = await api<any>(`/invoices/${id}/pdf`);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.title?.replace(/\s+/g, "_") ?? "invoice"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <div className="p-8 text-red-400">{error}</div>;
  if (!repair) return <div className="p-8 text-[var(--steel)]">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Link href="/portal" className="text-sm text-[var(--copper-hot)]">
        ← Garage
      </Link>
      <p className="mt-4 text-xs tracking-widest text-[var(--steel)]">{repair.trackingId}</p>
      <h1 className="font-display mt-1 text-4xl font-extrabold">
        {repair.vehicle.year} {repair.vehicle.make} {repair.vehicle.model}
      </h1>
      <p className="mt-3 text-sm">
        {repair.currentStage} — <span className="text-[var(--copper-hot)]">{repair.progressPercent}%</span>
      </p>
      {repair.expectedCompletionAt && (
        <p className="mt-1 text-sm text-[var(--steel)]">
          ETA {new Date(repair.expectedCompletionAt).toLocaleString()}
        </p>
      )}
      <div className="mt-3 h-1.5 rounded-sm bg-white/10">
        <div className="h-full rounded-sm bg-[var(--copper)]" style={{ width: `${repair.progressPercent}%` }} />
      </div>

      <h2 className="font-display mt-10 text-xl font-semibold">Timeline</h2>
      <ol className="mt-4 space-y-4 border-l border-[var(--line)] pl-4">
        {repair.stageEvents?.map((ev: any) => (
          <li key={ev.id} className="text-sm">
            <div className="font-medium">{ev.toStage}</div>
            <div className="text-[var(--steel)]">{new Date(ev.createdAt).toLocaleString()}</div>
            {ev.notes && <div className="text-[var(--steel)]">{ev.notes}</div>}
          </li>
        ))}
      </ol>

      {!!repair.estimates?.length && (
        <>
          <h2 className="font-display mt-10 text-xl font-semibold">Estimates</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {repair.estimates.map((est: any) => (
              <li key={est.id} className="panel rounded-sm p-3">
                Status: {est.status}
                {est.total != null && (
                  <span className="text-[var(--steel)]">
                    {" "}
                    · {est.currency ?? "USD"} {Number(est.total).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {!!repair.warranties?.length && (
        <>
          <h2 className="font-display mt-10 text-xl font-semibold">Warranty</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--steel)]">
            {repair.warranties.map((w: any) => (
              <li key={w.id}>
                {w.title} — until {new Date(w.endsAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </>
      )}

      {!!repair.invoices?.length && (
        <>
          <h2 className="font-display mt-10 text-xl font-semibold">Invoices</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {repair.invoices.map((inv: any) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 panel rounded-sm p-3">
                <span>
                  {inv.number}: {inv.currency} {Number(inv.grandTotal).toFixed(2)} ({inv.status})
                </span>
                <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => downloadInvoice(inv.id)}>
                  Download
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!!repair.documents?.length && (
        <>
          <h2 className="font-display mt-10 text-xl font-semibold">Documents</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {repair.documents.map((d: any) => (
              <li key={d.id}>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-[var(--copper-hot)]">
                    {d.title ?? d.fileName ?? "Document"}
                  </a>
                ) : (
                  d.title ?? "Document"
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {!!repair.photos?.length && (
        <>
          <h2 className="font-display mt-10 text-xl font-semibold">Photos</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {repair.photos.map((p: any) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt={p.caption ?? "Repair photo"} className="rounded-sm object-cover" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
