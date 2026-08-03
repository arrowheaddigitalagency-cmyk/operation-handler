"use client";

import { useState } from "react";
import Link from "next/link";
import { AI_ESTIMATE_DISCLAIMER } from "@cc/domain";

type Analysis = {
  id: string;
  reportId?: string;
  status: string;
  disclaimer: string;
  pricedJson?: {
    summary: string;
    lines: Array<{ part: string; severity: string; description: string; costMin: number; costMax: number }>;
    durationDaysMin: number;
    durationDaysMax: number;
    costMin: number;
    costMax: number;
    currency: string;
  };
  resultJson?: {
    summary: string;
    findings: Array<{ part: string; severity: string; description: string }>;
    durationDaysMin: number;
    durationDaysMax: number;
    costMin: number;
    costMax: number;
    currency: string;
  };
};

export default function AssessPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", make: "", model: "", year: "" });

  function onFiles(list: FileList | null) {
    setFiles(list);
    if (!list) return setPreviews([]);
    setPreviews(Array.from(list).slice(0, 8).map((f) => URL.createObjectURL(f)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!files?.length) return;
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    setContact({
      name: String(fd.get("guestName") || ""),
      email: String(fd.get("guestEmail") || ""),
      phone: String(fd.get("guestPhone") || ""),
      make: String(fd.get("make") || ""),
      model: String(fd.get("model") || ""),
      year: String(fd.get("year") || ""),
    });
    Array.from(files).forEach((f) => fd.append("images", f));
    try {
      const res = await fetch(`/api/v1/ai/damage-analysis`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const started = (await res.json()) as { id: string; reportId: string };
      setReportId(started.reportId);
      let result: Analysis | null = null;
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 800));
        const poll = await fetch(`/api/v1/ai/damage-analysis/${started.id}`);
        result = (await poll.json()) as Analysis;
        if (result.status === "COMPLETED" || result.status === "FAILED" || result.status === "NEEDS_MORE_IMAGES") break;
      }
      if (!result || result.status === "FAILED") throw new Error("Analysis failed");
      setAnalysis(result);
      if (result.status === "NEEDS_MORE_IMAGES") {
        setError("Confidence too low — please upload clearer photos from more angles.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  const priced = analysis?.pricedJson;
  const fallback = analysis?.resultJson;

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,101,44,0.18),transparent_55%),linear-gradient(180deg,rgba(11,16,22,0.85),var(--asphalt))]" />
      <div className="absolute inset-0 surface-grid opacity-30" />

      <div className="relative mx-auto max-w-5xl px-4 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">
          Cars Compound · AI Vision
        </p>
        <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
          Instant Damage Assessment
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--steel)]">
          Upload photos and your contact details. We generate a professional advisory report priced
          from Cars Compound repair bands — then create a CRM lead for our team.
        </p>

        <form onSubmit={onSubmit} className="panel relative mt-10 grid gap-6 overflow-hidden rounded-sm p-6 lg:grid-cols-2">
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden bg-[var(--asphalt)]/50">
              <div className="scan-line absolute inset-x-0 h-24 w-full" />
              <p className="absolute inset-0 flex items-center justify-center font-display text-sm tracking-[0.2em] text-[var(--copper-hot)] anim-pulse-soft">
                SCANNING · BUILDING REPORT
              </p>
            </div>
          )}

          <div className="space-y-3">
            <input name="guestName" required placeholder="Full name" className="field" />
            <input name="guestEmail" type="email" required placeholder="Email" className="field" />
            <input name="guestPhone" required placeholder="Phone" className="field" />
            <div className="grid grid-cols-3 gap-2">
              <input name="make" placeholder="Make" className="field" />
              <input name="model" placeholder="Model" className="field" />
              <input name="year" type="number" placeholder="Year" className="field" />
            </div>
            <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center border border-dashed border-[var(--line)] bg-black/20 px-4 py-8 text-center hover:border-[var(--copper)]">
              <span className="font-display font-semibold">Upload damage photos</span>
              <span className="mt-1 text-xs text-[var(--steel)]">JPEG / PNG / WebP · up to 8</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
            {!!previews.length && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {previews.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="aspect-square rounded-sm object-cover" />
                ))}
              </div>
            )}
            <p className="text-xs text-[var(--steel)]">{AI_ESTIMATE_DISCLAIMER}</p>
            <button disabled={loading || !files?.length} className="btn-primary disabled:opacity-40">
              {loading ? "Analyzing…" : "Generate AI Report"}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold">Advisory result</h2>
            {!priced && !fallback && analysis?.status !== "NEEDS_MORE_IMAGES" && (
              <p className="mt-4 text-sm text-[var(--steel)]">
                Findings and shop-priced ranges appear here. You will also get email/SMS with the report link.
              </p>
            )}
            {analysis?.status === "NEEDS_MORE_IMAGES" && (
              <div className="mt-4 space-y-3 rounded-sm border border-[var(--copper)]/40 bg-[color-mix(in_srgb,var(--copper)_10%,transparent)] p-4 text-sm">
                <p className="font-display font-semibold text-[var(--copper-hot)]">More photos needed</p>
                <p className="text-[var(--steel)]">
                  Confidence was too low for a reliable advisory report. Upload additional clear images
                  (different angles, closer detail) and try again — or book a physical inspection.
                </p>
                <Link href="/book" className="btn-ghost inline-flex">
                  Book inspection instead
                </Link>
              </div>
            )}
            {(priced || fallback) && analysis?.status === "COMPLETED" && (
              <div className="anim-fade-up mt-4 space-y-4">
                {reportId && (
                  <p className="text-xs tracking-widest text-[var(--copper-hot)]">Report {reportId}</p>
                )}
                <p className="text-sm">{priced?.summary ?? fallback?.summary}</p>
                <ul className="space-y-2 border-t border-[var(--line)] pt-4 text-sm">
                  {(priced?.lines ?? fallback?.findings.map((f) => ({ ...f, costMin: 0, costMax: 0 })) ?? []).map(
                    (f, i) => (
                      <li key={f.part + i}>
                        <strong>{f.part}</strong> ({f.severity}) — {f.description}
                        {"costMin" in f && f.costMin > 0 && (
                          <span className="block text-[var(--steel)]">
                            Band: {(priced?.currency ?? "USD")} {f.costMin.toLocaleString()}–
                            {f.costMax.toLocaleString()}
                          </span>
                        )}
                      </li>
                    ),
                  )}
                </ul>
                <div className="grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-4 text-sm">
                  <div>
                    <div className="text-[var(--steel)]">Shop duration</div>
                    <div className="font-display text-lg font-bold">
                      {(priced ?? fallback)?.durationDaysMin}–{(priced ?? fallback)?.durationDaysMax} days
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--steel)]">Shop price band</div>
                    <div className="font-display text-lg font-bold">
                      {(priced ?? fallback)?.currency} {(priced ?? fallback)?.costMin.toLocaleString()}–
                      {(priced ?? fallback)?.costMax.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  {reportId && (
                    <a href={`/api/v1/ai/reports/${reportId}/html`} target="_blank" rel="noreferrer" className="btn-primary">
                      Download / Print Report
                    </a>
                  )}
                  {analysis && (
                    <Link
                      href={`/book?analysisId=${analysis.id}&reportId=${reportId ?? ""}&name=${encodeURIComponent(contact.name)}&email=${encodeURIComponent(contact.email)}&phone=${encodeURIComponent(contact.phone)}&make=${encodeURIComponent(contact.make)}&model=${encodeURIComponent(contact.model)}&year=${encodeURIComponent(contact.year)}`}
                      className="btn-ghost"
                    >
                      Book Inspection
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
