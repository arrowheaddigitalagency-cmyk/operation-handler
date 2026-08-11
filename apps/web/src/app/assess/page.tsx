"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { AI_ESTIMATE_DISCLAIMER } from "@cc/domain";
import { MechanicIcon } from "@/components/mechanic-icon";

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

type Step = 0 | 1 | 2 | 3;

const STEPS = [
  { id: 0, label: "Vehicle", hint: "Car details" },
  { id: 1, label: "Photos", hint: "Damage angles" },
  { id: 2, label: "Contact", hint: "Send report" },
  { id: 3, label: "Result", hint: "Estimate" },
] as const;

const PHOTO_TIPS = [
  { t: "Wide shot", d: "Full panel in frame" },
  { t: "Close-up", d: "Scratch / dent detail" },
  { t: "Angle", d: "Corner + depth view" },
  { t: "Context", d: "Surrounding panels" },
] as const;

export default function AssessPage() {
  const [step, setStep] = useState<Step>(0);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    make: "",
    model: "",
    year: "",
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(".assess-hero-inner > *", {
      y: 24,
      opacity: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: "power3.out",
    });
  }, []);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      el.querySelector(".assess-panel-body"),
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" },
    );
  }, [step]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setFileList(list: FileList | File[] | null) {
    if (!list) {
      previews.forEach((p) => URL.revokeObjectURL(p));
      setFiles([]);
      setPreviews([]);
      return;
    }
    const next = Array.from(list).slice(0, 8);
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(contact.make.trim() && contact.model.trim());
    if (step === 1) return files.length > 0;
    if (step === 2) return Boolean(contact.name.trim() && contact.email.trim() && contact.phone.trim());
    return true;
  }, [step, contact, files.length]);

  const progress = ((step + (step === 3 ? 1 : 0.15)) / STEPS.length) * 100;

  async function runAnalysis() {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    setScanPct(8);
    const fd = new FormData();
    fd.set("guestName", contact.name);
    fd.set("guestEmail", contact.email);
    fd.set("guestPhone", contact.phone);
    fd.set("make", contact.make);
    fd.set("model", contact.model);
    fd.set("year", contact.year);
    files.forEach((f) => fd.append("images", f));

    const tick = window.setInterval(() => {
      setScanPct((p) => Math.min(92, p + Math.random() * 7));
    }, 450);

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
        setScanPct(Math.min(96, 20 + i * 2));
        if (result.status === "COMPLETED" || result.status === "FAILED" || result.status === "NEEDS_MORE_IMAGES") break;
      }
      if (!result || result.status === "FAILED") throw new Error("Analysis failed");
      setAnalysis(result);
      setScanPct(100);
      setStep(3);
      if (result.status === "NEEDS_MORE_IMAGES") {
        setError("Confidence too low — please upload clearer photos from more angles.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      window.clearInterval(tick);
      setLoading(false);
    }
  }

  function goNext() {
    if (!canNext || loading) return;
    if (step === 2) {
      void runAnalysis();
      return;
    }
    if (step < 2) setStep((s) => (s + 1) as Step);
  }

  function goBack() {
    if (loading) return;
    if (step === 3) {
      setStep(1);
      setAnalysis(null);
      setError(null);
      return;
    }
    if (step > 0) setStep((s) => (s - 1) as Step);
  }

  const priced = analysis?.pricedJson;
  const fallback = analysis?.resultJson;
  const vehicleLabel = [contact.year, contact.make, contact.model].filter(Boolean).join(" ") || "Your vehicle";

  return (
    <div ref={pageRef} className="assess-page site-light">
      <section className="assess-hero">
        <div className="assess-hero-lines" aria-hidden />
        <div className="assess-hero-glow" aria-hidden />
        <div className="assess-hero-inner mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="assess-badge">
                <MechanicIcon className="h-5 w-5 ai-mech-spin" />
              </span>
              <div>
                <p className="eyebrow !text-[var(--accent-hot)]">Cars Compound · AI Vision</p>
                <h1 className="font-display mt-2 text-[clamp(2rem,5vw,3.4rem)] font-extrabold tracking-tight text-white">
                  Instant Damage <span className="text-[var(--accent-hot)]">Assessment</span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
                  Guided shop flow — vehicle, photos, contact — then a priced advisory report in minutes.
                </p>
              </div>
            </div>
            <div className="assess-hero-pills">
              <span>⏱ ~2 min</span>
              <span>📷 Up to 8 photos</span>
              <span>🛠 Shop-priced bands</span>
            </div>
          </div>

          <div className="assess-progress-wrap mt-8">
            <div className="assess-progress-bar" aria-hidden>
              <i style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
            <ol className="assess-steps" aria-label="Assessment steps">
              {STEPS.map((s, i) => {
                const active = step === s.id;
                const done = step > s.id || (step === 3 && s.id === 3);
                return (
                  <li key={s.id} className={`assess-step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
                    <span className="assess-step-num">{done && !active ? "✓" : String(i + 1)}</span>
                    <span className="assess-step-copy">
                      <strong>{s.label}</strong>
                      <small>{s.hint}</small>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div ref={panelRef} className="assess-shell">
          <div className="assess-panel">
            {loading && (
              <div className="assess-scan" aria-live="polite">
                <div className="assess-scan-line" />
                <div className="assess-scan-card">
                  <MechanicIcon className="h-8 w-8 text-[var(--accent)] ai-mech-spin" />
                  <p className="font-display text-sm font-bold tracking-[0.18em] text-white">SCANNING DAMAGE</p>
                  <div className="assess-progress">
                    <span style={{ width: `${scanPct}%` }} />
                  </div>
                  <p className="text-xs text-white/60">{Math.round(scanPct)}% · building advisory report</p>
                </div>
              </div>
            )}

            <div className="assess-panel-body">
              {step === 0 && (
                <div className="assess-grid">
                  <div className="assess-head-row">
                    <div>
                      <h2 className="assess-title">Your vehicle</h2>
                      <p className="assess-sub">We map findings to the right repair bands for this car.</p>
                    </div>
                    <div className="assess-live-chip">
                      <MechanicIcon className="h-4 w-4" />
                      <span>{vehicleLabel}</span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="assess-field">
                      <span>Make</span>
                      <input
                        value={contact.make}
                        onChange={(e) => setContact((c) => ({ ...c, make: e.target.value }))}
                        placeholder="Toyota"
                        className="field"
                        autoFocus
                      />
                    </label>
                    <label className="assess-field">
                      <span>Model</span>
                      <input
                        value={contact.model}
                        onChange={(e) => setContact((c) => ({ ...c, model: e.target.value }))}
                        placeholder="Camry"
                        className="field"
                      />
                    </label>
                    <label className="assess-field">
                      <span>Year</span>
                      <input
                        value={contact.year}
                        onChange={(e) => setContact((c) => ({ ...c, year: e.target.value }))}
                        type="number"
                        placeholder="2021"
                        className="field"
                      />
                    </label>
                  </div>
                  <div className="assess-tip-row">
                    <span>Tip</span>
                    Exact make/model helps severity and pricing accuracy.
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="assess-grid">
                  <div>
                    <h2 className="assess-title">Damage photos</h2>
                    <p className="assess-sub">Clear angles beat quantity — but you can add up to 8.</p>
                  </div>

                  <div className="assess-tip-grid">
                    {PHOTO_TIPS.map((tip) => (
                      <div key={tip.t} className="assess-tip-card">
                        <strong>{tip.t}</strong>
                        <small>{tip.d}</small>
                      </div>
                    ))}
                  </div>

                  <label
                    className={`assess-drop ${dragOver ? "is-over" : ""} ${files.length ? "has-files" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      setFileList(e.dataTransfer.files);
                    }}
                  >
                    <span className="assess-drop-icon">
                      <MechanicIcon className="h-7 w-7" />
                    </span>
                    <strong>Drop photos here or tap to browse</strong>
                    <small>JPEG / PNG / WebP · {files.length}/8 selected</small>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => setFileList(e.target.files)}
                    />
                  </label>

                  {!!previews.length && (
                    <div className="assess-thumbs">
                      {previews.map((src, i) => (
                        <div key={src} className="assess-thumb" style={{ animationDelay: `${i * 60}ms` }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" />
                          <button
                            type="button"
                            aria-label="Remove photo"
                            onClick={() => setFileList(files.filter((_, idx) => idx !== i))}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="assess-grid">
                  <div className="assess-head-row">
                    <div>
                      <h2 className="assess-title">Contact details</h2>
                      <p className="assess-sub">We create a CRM lead and can send your report link.</p>
                    </div>
                    <div className="assess-live-chip soft">
                      {files.length} photo{files.length === 1 ? "" : "s"} ready
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <label className="assess-field">
                      <span>Full name</span>
                      <input
                        value={contact.name}
                        onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                        placeholder="Jordan Lee"
                        className="field"
                        autoFocus
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="assess-field">
                        <span>Email</span>
                        <input
                          value={contact.email}
                          onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                          type="email"
                          placeholder="you@email.com"
                          className="field"
                        />
                      </label>
                      <label className="assess-field">
                        <span>Phone</span>
                        <input
                          value={contact.phone}
                          onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                          placeholder="(770) 555-0100"
                          className="field"
                        />
                      </label>
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--muted)]">{AI_ESTIMATE_DISCLAIMER}</p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="assess-grid">
                  <div>
                    <h2 className="assess-title">Advisory result</h2>
                    <p className="assess-sub">Shop-priced guidance — not a final invoice. Book for a physical inspection.</p>
                  </div>

                  {analysis?.status === "NEEDS_MORE_IMAGES" && (
                    <div className="assess-alert">
                      <p className="font-display font-semibold text-[var(--accent)]">More photos needed</p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Confidence was too low. Add clearer angles and try again — or book a physical inspection.
                      </p>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button type="button" className="btn-primary btn-anim" onClick={() => setStep(1)}>
                          Add photos
                        </button>
                        <Link href="/book" className="btn-ghost btn-anim">
                          Book inspection
                        </Link>
                      </div>
                    </div>
                  )}

                  {!priced && !fallback && analysis?.status !== "NEEDS_MORE_IMAGES" && (
                    <p className="text-sm text-[var(--muted)]">No priced findings yet. Try again with more photos.</p>
                  )}

                  {(priced || fallback) && analysis?.status === "COMPLETED" && (
                    <div className="assess-result">
                      {reportId && <p className="assess-report-id">Report {reportId}</p>}
                      <p className="text-sm leading-relaxed text-[var(--ink)] sm:text-base">
                        {priced?.summary ?? fallback?.summary}
                      </p>

                      <ul className="assess-findings">
                        {(
                          priced?.lines ??
                          fallback?.findings.map((f) => ({ ...f, costMin: 0, costMax: 0 })) ??
                          []
                        ).map((f, i) => (
                          <li key={f.part + i} style={{ animationDelay: `${i * 70}ms` }}>
                            <div>
                              <strong>{f.part}</strong>
                              <span className="assess-sev">{f.severity}</span>
                            </div>
                            <p>{f.description}</p>
                            {"costMin" in f && f.costMin > 0 && (
                              <em>
                                Band: {priced?.currency ?? "USD"} {f.costMin.toLocaleString()}–{f.costMax.toLocaleString()}
                              </em>
                            )}
                          </li>
                        ))}
                      </ul>

                      <div className="assess-stats">
                        <div>
                          <span>Shop duration</span>
                          <strong>
                            {(priced ?? fallback)?.durationDaysMin}–{(priced ?? fallback)?.durationDaysMax} days
                          </strong>
                        </div>
                        <div>
                          <span>Shop price band</span>
                          <strong>
                            {(priced ?? fallback)?.currency} {(priced ?? fallback)?.costMin.toLocaleString()}–
                            {(priced ?? fallback)?.costMax.toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
                        {reportId && (
                          <a
                            href={`/api/v1/ai/reports/${reportId}/html`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-primary btn-anim"
                          >
                            Download / Print Report
                          </a>
                        )}
                        {analysis && (
                          <Link
                            href={`/book?analysisId=${analysis.id}&reportId=${reportId ?? ""}&name=${encodeURIComponent(contact.name)}&email=${encodeURIComponent(contact.email)}&phone=${encodeURIComponent(contact.phone)}&make=${encodeURIComponent(contact.make)}&model=${encodeURIComponent(contact.model)}&year=${encodeURIComponent(contact.year)}`}
                            className="btn-ghost btn-anim"
                          >
                            Book Inspection
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && step !== 3 && <p className="mt-4 text-sm text-red-500">{error}</p>}
              {error && step === 3 && analysis?.status !== "NEEDS_MORE_IMAGES" && (
                <p className="mt-4 text-sm text-red-500">{error}</p>
              )}

              {step < 3 && (
                <div className="assess-nav">
                  <button
                    type="button"
                    className="btn-ghost btn-anim !w-auto"
                    onClick={goBack}
                    disabled={step === 0 || loading}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-anim !w-auto min-w-[10rem]"
                    onClick={goNext}
                    disabled={!canNext || loading}
                  >
                    {step === 2 ? (loading ? "Analyzing…" : "Generate report") : "Continue"}
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="assess-nav">
                  <button type="button" className="btn-ghost btn-anim !w-auto" onClick={goBack}>
                    New assessment
                  </button>
                  <Link href="/" className="btn-primary btn-anim !w-auto">
                    Back to home
                  </Link>
                </div>
              )}
            </div>
          </div>

          <aside className="assess-aside">
            <div className="assess-aside-card">
              <p className="assess-aside-kicker">Live summary</p>
              <h3>{vehicleLabel}</h3>
              <ul>
                <li>
                  <span>Step</span>
                  <strong>
                    {step + 1} / {STEPS.length}
                  </strong>
                </li>
                <li>
                  <span>Photos</span>
                  <strong>{files.length}</strong>
                </li>
                <li>
                  <span>Contact</span>
                  <strong>{contact.name || contact.email ? "Ready" : "Pending"}</strong>
                </li>
              </ul>
            </div>
            <div className="assess-aside-card soft">
              <p className="assess-aside-kicker">Why it feels good</p>
              <ul className="assess-aside-bullets">
                <li>Short steps — no long form dump</li>
                <li>Photo tips before you upload</li>
                <li>Shop bands, not random AI prices</li>
                <li>Book inspection in one tap after</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
