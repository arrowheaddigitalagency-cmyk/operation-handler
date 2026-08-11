"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type TrackResult = {
  trackingId: string;
  currentStage: string;
  stageLabel: string;
  progressPercent: number;
  expectedCompletionAt?: string;
  vehicle: { make: string; model: string; year: number };
  stageEvents: Array<{ toStage: string; notes?: string; createdAt: string; progressPercent: number }>;
};

function TrackForm() {
  const params = useSearchParams();
  const [trackingId, setTrackingId] = useState(params.get("id") ?? "");
  const [data, setData] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup(id: string) {
    setError(null);
    try {
      const result = await api<TrackResult>(`/repairs/track/${encodeURIComponent(id.trim())}`);
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Not found");
    }
  }

  useEffect(() => {
    const prefill = params.get("id");
    if (prefill?.trim()) {
      setTrackingId(prefill);
      void lookup(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot from URL
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await lookup(trackingId);
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="CC-XXXXXX"
          className="field flex-1 uppercase"
        />
        <button className="btn-primary sm:shrink-0">Track</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {data && (
        <div className="feature-panel anim-fade-up mt-8 rounded-sm p-6">
          <p className="text-xs tracking-widest text-[var(--steel)]">{data.trackingId}</p>
          <h2 className="font-display mt-1 text-2xl font-bold">
            {data.vehicle.year} {data.vehicle.make} {data.vehicle.model}
          </h2>
          <p className="mt-3 text-sm">
            {data.stageLabel} · <span className="text-[var(--copper-hot)]">{data.progressPercent}%</span>
          </p>
          {data.expectedCompletionAt && (
            <p className="mt-1 text-sm text-[var(--steel)]">
              Estimated completion: {new Date(data.expectedCompletionAt).toLocaleString()}
            </p>
          )}
          <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-white/10">
            <div
              className="h-full bg-[var(--copper)] transition-all duration-700"
              style={{ width: `${data.progressPercent}%` }}
            />
          </div>
          <ol className="mt-8 space-y-4 border-l border-[var(--line)] pl-4">
            {data.stageEvents.map((ev) => (
              <li key={ev.createdAt + ev.toStage} className="text-sm">
                <div className="font-medium text-[var(--mist)]">{ev.toStage}</div>
                <div className="text-[var(--steel)]">{new Date(ev.createdAt).toLocaleString()}</div>
                {ev.notes && <div className="text-[var(--steel)]">{ev.notes}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

export default function TrackPage() {
  return (
    <div className="site-light section-ambient">
      <div className="relative mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className="surface mb-8 rounded-xl p-6 md:p-8">
          <p className="eyebrow">Cars Compound</p>
          <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight">Track Your Repair</h1>
          <p className="mt-3 text-[var(--muted)]">Enter your Tracking ID for live stage updates.</p>
        </div>
        <Suspense fallback={<p className="text-[var(--muted)]">Loading…</p>}>
          <TrackForm />
        </Suspense>
      </div>
    </div>
  );
}
