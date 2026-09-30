"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AI_ESTIMATE_DISCLAIMER } from "@cc/domain";
import { compressImageFile } from "@/lib/compress-image";
import {
  analyzeSession,
  bookSession,
  createSession,
  decodeVin,
  getSlots,
  patchSession,
  priceSession,
  removePhoto,
  updateLine,
  uploadPhotos,
  type DecodedVehicle,
  type DeSession,
} from "@/lib/damage-estimate-api";
import { DeProgressBar } from "./ProgressBar";
import { PhotoWithOverlays } from "./PhotoOverlays";

const STEPS = ["VIN", "Paint", "Photos", "AI scan", "Estimate", "Book", "Done"];

const PAINT_HELP: Record<string, string> = {
  single_stage: "One layer of paint color (common on older / commercial vehicles).",
  two_stage: "Color base coat + clear coat (most modern cars).",
  three_stage: "Pearl / tri-coat — color + mid coat + clear (higher refinish cost).",
};

const AI_MISTAKE_NOTE =
  "AI can make mistakes. It may miss light damage, mislabel a panel, or over/under-estimate severity. A Cars Compound technician confirms everything in person.";

export function DamageEstimateWizard() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<DeSession | null>(null);
  const [vinInput, setVinInput] = useState("");
  const [vehicle, setVehicle] = useState<DecodedVehicle | null>(null);
  const [paintCode, setPaintCode] = useState("");
  const [paintType, setPaintType] = useState("two_stage");
  const [mode, setMode] = useState<"OEM" | "AFTERMARKET" | "MIXED">("MIXED");
  const [slots, setSlots] = useState<{ iso: string; label: string }[]>([]);
  const [bookForm, setBookForm] = useState({ name: "", phone: "", email: "", preferredAt: "", slotLabel: "" });
  const [trackingId, setTrackingId] = useState<string | null>(null);

  const photos = session?.photosJson ?? [];
  const lines = session?.lines ?? [];

  const ensureSession = useCallback(async () => {
    if (session) return session;
    const s = await createSession();
    setSession(s);
    return s;
  }, [session]);

  async function onDecode() {
    setError(null);
    setLoading(true);
    try {
      const v = await decodeVin(vinInput);
      setVehicle(v);
      const s = await ensureSession();
      const updated = await patchSession(s.id, { vin: v.vin, vehicleJson: v });
      setSession(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "VIN decode failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSavePaint() {
    setError(null);
    setLoading(true);
    try {
      const s = await ensureSession();
      const updated = await patchSession(s.id, {
        paintJson: { paintCode: paintCode || undefined, paintType, notes: PAINT_HELP[paintType] },
      });
      setSession(updated);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save paint");
    } finally {
      setLoading(false);
    }
  }

  async function onPhotosSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    setLoading(true);
    try {
      const s = await ensureSession();
      const compressed: File[] = [];
      for (const f of Array.from(fileList)) {
        if (!f.type.startsWith("image/")) continue;
        compressed.push(await compressImageFile(f));
      }
      if (!compressed.length) throw new Error("Please choose image files (JPG/PNG/WebP)");
      const updated = await uploadPhotos(s.id, compressed);
      setSession(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function onAnalyze() {
    setError(null);
    setLoading(true);
    try {
      if (!session) throw new Error("Missing session");
      const updated = await analyzeSession(session.id);
      setSession(updated);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function onMode(m: "OEM" | "AFTERMARKET" | "MIXED") {
    setMode(m);
    if (!session) return;
    setLoading(true);
    try {
      const priced = await priceSession(session.id, m);
      setSession(priced.session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pricing failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (step === 5) {
      getSlots()
        .then(setSlots)
        .catch(() => setSlots([]));
    }
  }, [step]);

  async function onBook(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const res = await bookSession(session.id, {
        name: bookForm.name,
        phone: bookForm.phone,
        email: bookForm.email,
        preferredAt: bookForm.preferredAt,
        slotLabel: bookForm.slotLabel,
      });
      setSession(res.session);
      setTrackingId(res.appointment.trackingId ?? null);
      setStep(6);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  const overlaysByPhoto = useMemo(() => {
    const map: Record<number, { bbox: { x: number; y: number; w: number; h: number }; label: string }[]> = {};
    for (const l of lines) {
      if (l.bboxJson == null || l.imageIndex == null) continue;
      (map[l.imageIndex] ??= []).push({
        bbox: l.bboxJson,
        label: `${l.partName} (${l.severity ?? "?"})`,
      });
    }
    return map;
  }, [lines]);

  const analysisNotes = useMemo(() => {
    const versions = session?.versions ?? [];
    const ai = [...versions].reverse().find((v) => v.kind === "AI_ANALYSIS");
    const notes = ai?.payloadJson?.notes;
    return Array.isArray(notes) ? notes.filter((n): n is string => typeof n === "string") : [];
  }, [session?.versions]);

  const photoCount = photos.length;
  const coveredPhotos = useMemo(() => {
    const set = new Set<number>();
    for (const l of lines) {
      if (l.imageIndex != null) set.add(l.imageIndex);
    }
    return set.size;
  }, [lines]);

  return (
    <div className="site-light section-ambient">
      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--paper-line)] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--copper)] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--copper)]" />
            AI vision
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Collision estimate
          </span>
        </div>

        <h1 className="font-display mt-3 text-[clamp(1.85rem,5vw,2.65rem)] font-extrabold tracking-tight text-[var(--ink)]">
          Photo-by-photo damage scan
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
          VIN decode, AI inspection of every photo, line-item range, then book an in-shop confirmation.
        </p>

        <aside className="surface-quiet mt-5 space-y-2 rounded-xl p-4">
          <p className="text-sm leading-relaxed text-[var(--ink)]">{AI_MISTAKE_NOTE}</p>
          <p className="text-xs leading-relaxed text-[var(--muted)]">{AI_ESTIMATE_DISCLAIMER}</p>
        </aside>

        <DeProgressBar step={step} total={STEPS.length} labels={STEPS} />

        {session?.samplePricing && step >= 4 && (
          <p className="mb-4 inline-flex rounded-lg border border-amber-500/30 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
            Sample pricing — starter catalog, not a final shop invoice
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {step === 0 && (
          <div className="panel space-y-4 rounded-xl p-5 sm:p-6">
            <label className="block text-sm font-medium text-[var(--ink)]">
              17-character VIN
              <input
                className="field mt-1.5 uppercase"
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                maxLength={17}
                placeholder="1HGCM82633A004352"
                autoComplete="off"
              />
            </label>
            <button type="button" className="btn-primary w-full sm:w-auto" disabled={loading} onClick={onDecode}>
              {loading ? "Decoding…" : "Decode VIN (NHTSA)"}
            </button>
            {vehicle && (
              <div className="rounded-xl border border-[var(--paper-line)] bg-[var(--paper-deep)] p-4 text-sm">
                <p className="font-semibold text-[var(--ink)]">
                  {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim ?? ""}
                </p>
                <ul className="mt-2 grid gap-1 text-[var(--muted)] sm:grid-cols-2">
                  <li>Body: {vehicle.bodyClass ?? "—"}</li>
                  <li>Engine: {vehicle.engine ?? "—"}</li>
                  <li>Drive: {vehicle.driveType ?? "—"}</li>
                  <li>Plant: {vehicle.plantCountry ?? "—"}</li>
                </ul>
                <button type="button" className="btn-primary mt-4 w-full sm:w-auto" onClick={() => setStep(1)}>
                  Confirm vehicle
                </button>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="panel space-y-4 rounded-xl p-5 sm:p-6">
            <p className="text-sm text-[var(--muted)]">
              Type the paint code from the door jamb sticker, or leave blank and pick paint type.
            </p>
            <input
              className="field"
              placeholder="Paint code (optional)"
              value={paintCode}
              onChange={(e) => setPaintCode(e.target.value)}
            />
            <div className="space-y-2">
              {(["single_stage", "two_stage", "three_stage"] as const).map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${
                    paintType === t
                      ? "border-[var(--copper)]/40 bg-[color-mix(in_srgb,var(--copper)_8%,white)]"
                      : "border-[var(--paper-line)] bg-white"
                  }`}
                >
                  <input type="radio" name="paint" checked={paintType === t} onChange={() => setPaintType(t)} />
                  <span>
                    <span className="font-medium text-[var(--ink)]">
                      {t === "single_stage"
                        ? "Single-stage"
                        : t === "two_stage"
                          ? "Two-stage (base + clear)"
                          : "Three-stage / pearl"}
                    </span>
                    <span className="mt-1 block text-[var(--muted)]">{PAINT_HELP[t]}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" className="btn-ghost" onClick={() => setStep(0)}>
                Back
              </button>
              <button type="button" className="btn-primary" disabled={loading} onClick={onSavePaint}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="panel space-y-4 rounded-xl p-5 sm:p-6">
            <p className="text-sm text-[var(--muted)]">
              Upload a full-car view from corners plus close-ups of damage. Every photo is scanned by AI.
            </p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="field"
              onChange={(e) => onPhotosSelected(e.target.files)}
            />
            {loading && <p className="text-xs text-[var(--copper)]">Compressing &amp; uploading…</p>}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {photos.map((p, i) => (
                <div key={p.storageKey} className="relative overflow-hidden rounded-xl border border-[var(--paper-line)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                    #{i + 1}
                  </span>
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white"
                    onClick={async () => {
                      if (!session) return;
                      setSession(await removePhoto(session.id, i));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!photos.length || loading}
                onClick={() => setStep(3)}
              >
                Continue to AI scan
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="panel space-y-4 rounded-xl p-5 sm:p-6">
            <div className="rounded-xl border border-[var(--paper-line)] bg-[var(--paper-deep)] p-4">
              <p className="text-sm font-semibold text-[var(--ink)]">Ready to run AI scan</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Each of your {photos.length || "—"} photo{photos.length === 1 ? "" : "s"} is checked for dents,
                scratches, cracks, lamps, and related exterior damage. You can edit lines afterward.
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--paper-line)] bg-white px-3 py-3 text-sm text-[var(--ink)]">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--copper)] border-t-transparent" />
                Scanning photos with AI… this can take a minute on free models.
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" className="btn-ghost" disabled={loading} onClick={() => setStep(2)}>
                Back
              </button>
              <button type="button" className="btn-primary" disabled={loading} onClick={onAnalyze}>
                {loading ? "AI scanning…" : "Run AI analysis"}
              </button>
            </div>
          </div>
        )}

        {step === 4 && session && (
          <div className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {photos.map((p, i) => (
                <div key={p.storageKey} className="overflow-hidden rounded-xl border border-[var(--paper-line)] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--paper-line)] bg-[var(--paper-deep)] px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                    <span>Photo {i + 1}</span>
                    <span>
                      {(overlaysByPhoto[i]?.length ?? 0) > 0
                        ? `${overlaysByPhoto[i]!.length} AI hit(s)`
                        : "No box"}
                    </span>
                  </div>
                  <PhotoWithOverlays url={p.url} boxes={overlaysByPhoto[i] ?? []} />
                </div>
              ))}
            </div>

            <div className="panel rounded-xl p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                {(["OEM", "AFTERMARKET", "MIXED"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      mode === m
                        ? "bg-[var(--copper)] text-white"
                        : "border border-[var(--paper-line)] text-[var(--muted)]"
                    }`}
                    onClick={() => onMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-xl font-semibold tabular-nums text-[var(--ink)] sm:text-2xl">
                ${session.rangeLow?.toFixed(0) ?? "—"} – ${session.rangeHigh?.toFixed(0) ?? "—"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Confidence: {session.confidence != null ? `${Math.round(session.confidence * 100)}%` : "—"}
                {photoCount > 0 ? ` · Photos with detections: ${coveredPhotos}/${photoCount}` : ""}
              </p>
              <p className="mt-3 border-t border-[var(--paper-line)] pt-3 text-xs leading-relaxed text-[var(--muted)]">
                {AI_MISTAKE_NOTE}
              </p>
              {analysisNotes.length > 0 && (
                <details className="mt-3 text-xs text-[var(--muted)]">
                  <summary className="cursor-pointer font-medium text-[var(--copper)]">AI scan log</summary>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {analysisNotes.map((n, i) => (
                      <li key={i}>• {n}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                AI line items — edit if needed
              </p>
              {lines.map((l) => (
                <div key={l.id} className="panel rounded-xl p-3 text-sm sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--ink)]">{l.partName}</p>
                      <p className="text-[var(--muted)]">
                        {l.operation} · {l.severity ?? "—"} · {l.side ?? "—"}
                        {l.confidence != null ? ` · ${Math.round(l.confidence * 100)}%` : ""}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        OEM: {l.oemPrice != null ? `$${l.oemPrice}` : "data needed"} · AM:{" "}
                        {l.aftermarketPrice != null ? `$${l.aftermarketPrice}` : "data needed"}
                        {l.capaCertified ? " · CAPA" : ""}
                      </p>
                    </div>
                    <select
                      className="field w-full text-xs sm:max-w-[140px]"
                      value={l.operation}
                      onChange={async (e) => {
                        setSession(await updateLine(session.id, l.id, { operation: e.target.value }));
                        await onMode(mode);
                      }}
                    >
                      {["repair", "replace", "refinish", "blend", "r_and_i"].map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
                Back
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep(5)}>
                Agree &amp; book inspection
              </button>
              <a
                className="btn-ghost text-center"
                href={`/api/v1/damage-estimate/sessions/${session.id}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                Download estimate PDF
              </a>
            </div>
          </div>
        )}

        {step === 5 && (
          <form className="panel space-y-3 rounded-xl p-5 sm:p-6" onSubmit={onBook}>
            <p className="text-sm text-[var(--muted)]">
              Pick a time — we create a shop appointment and CRM lead linked to this estimate.
            </p>
            <input
              className="field"
              required
              placeholder="Full name"
              value={bookForm.name}
              onChange={(e) => setBookForm({ ...bookForm, name: e.target.value })}
            />
            <input
              className="field"
              required
              placeholder="Phone"
              value={bookForm.phone}
              onChange={(e) => setBookForm({ ...bookForm, phone: e.target.value })}
            />
            <input
              className="field"
              required
              type="email"
              placeholder="Email"
              value={bookForm.email}
              onChange={(e) => setBookForm({ ...bookForm, email: e.target.value })}
            />
            <select
              className="field"
              required
              value={bookForm.preferredAt}
              onChange={(e) => {
                const slot = slots.find((s) => s.iso === e.target.value);
                setBookForm({ ...bookForm, preferredAt: e.target.value, slotLabel: slot?.label ?? "" });
              }}
            >
              <option value="">Select a time slot</option>
              {slots.map((s) => (
                <option key={s.iso} value={s.iso}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted)]">{AI_ESTIMATE_DISCLAIMER}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" className="btn-ghost" onClick={() => setStep(4)}>
                Back
              </button>
              <button className="btn-primary" disabled={loading}>
                {loading ? "Booking…" : "Confirm booking"}
              </button>
            </div>
          </form>
        )}

        {step === 6 && (
          <div className="panel space-y-4 rounded-xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[var(--ink)]">You&apos;re booked</h2>
            {trackingId && (
              <p className="text-sm text-[var(--muted)]">
                Tracking ID: <strong className="text-[var(--ink)]">{trackingId}</strong>
              </p>
            )}
            <p className="text-sm text-[var(--muted)]">
              Estimate range: ${session?.rangeLow?.toFixed(0) ?? "—"} – ${session?.rangeHigh?.toFixed(0) ?? "—"}
            </p>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              Your lead is on the shop dashboard. {AI_MISTAKE_NOTE}
            </p>
            {session && (
              <a
                className="btn-primary inline-flex"
                href={`/api/v1/damage-estimate/sessions/${session.id}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                Download PDF summary
              </a>
            )}
            <Link href="/track" className="block text-sm font-medium text-[var(--copper)]">
              Track your visit →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
