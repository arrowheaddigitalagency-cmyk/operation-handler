"use client";

import { useState } from "react";
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

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState("");
  const [data, setData] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await api<TrackResult>(`/repairs/track/${encodeURIComponent(trackingId.trim())}`);
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Not found");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">
        Cars Compound
      </p>
      <h1 className="font-display mt-2 text-4xl font-extrabold">Track Your Repair</h1>
      <form onSubmit={onSubmit} className="mt-8 flex gap-2">
        <input
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="CC-XXXXXX"
          className="field flex-1 uppercase"
        />
        <button className="btn-primary">Track</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {data && (
        <div className="panel anim-fade-up mt-8 rounded-sm p-6">
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
    </div>
  );
}
