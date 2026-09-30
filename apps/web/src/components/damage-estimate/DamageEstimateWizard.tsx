"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

const STEPS = ["VIN", "Paint", "Photos", "AI analysis", "Estimate", "Book", "Done"];

const PAINT_HELP: Record<string, string> = {
  single_stage: "One layer of paint color (common on older / commercial vehicles).",
  two_stage: "Color base coat + clear coat (most modern cars).",
  three_stage: "Pearl / tri-coat — color + mid coat + clear (higher refinish cost).",
};

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">
        Collision estimate
      </p>
      <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        AI damage assessment
      </h1>
      <p className="mt-2 text-sm text-[var(--steel)]">
        VIN decode, photos, line-item estimate (OEM / aftermarket), then book an inspection.
        Preliminary only — a technician confirms after they see the car.
      </p>

      <DeProgressBar step={step} total={STEPS.length} labels={STEPS} />

      {session?.samplePricing && step >= 4 && (
        <p className="mb-4 inline-flex rounded-sm border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
          Sample pricing — starter data, not a final shop invoice
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {step === 0 && (
        <div className="panel space-y-4 rounded-sm p-6">
          <label className="block text-sm text-[var(--mist)]">
            17-character VIN
            <input
              className="field mt-1 uppercase"
              value={vinInput}
              onChange={(e) => setVinInput(e.target.value.toUpperCase())}
              maxLength={17}
              placeholder="1HGCM82633A004352"
            />
          </label>
          <button type="button" className="btn-primary" disabled={loading} onClick={onDecode}>
            {loading ? "Decoding…" : "Decode VIN (NHTSA)"}
          </button>
          {vehicle && (
            <div className="rounded-sm border border-[var(--line)] bg-black/20 p-4 text-sm">
              <p className="font-semibold text-[var(--mist)]">
                {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim ?? ""}
              </p>
              <ul className="mt-2 space-y-1 text-[var(--steel)]">
                <li>Body: {vehicle.bodyClass ?? "—"}</li>
                <li>Engine: {vehicle.engine ?? "—"}</li>
                <li>Drive: {vehicle.driveType ?? "—"}</li>
                <li>Plant: {vehicle.plantCountry ?? "—"}</li>
              </ul>
              <button type="button" className="btn-primary mt-4" onClick={() => setStep(1)}>
                Confirm vehicle
              </button>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="panel space-y-4 rounded-sm p-6">
          <p className="text-sm text-[var(--steel)]">
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
              <label key={t} className="flex cursor-pointer gap-3 rounded-sm border border-[var(--line)] p-3 text-sm">
                <input type="radio" name="paint" checked={paintType === t} onChange={() => setPaintType(t)} />
                <span>
                  <span className="font-medium text-[var(--mist)]">
                    {t === "single_stage" ? "Single-stage" : t === "two_stage" ? "Two-stage (base + clear)" : "Three-stage / pearl"}
                  </span>
                  <span className="mt-1 block text-[var(--steel)]">{PAINT_HELP[t]}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
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
        <div className="panel space-y-4 rounded-sm p-6">
          <p className="text-sm text-[var(--steel)]">
            Upload a full-car view from corners plus close-ups of damage. Photos are compressed on your phone before upload.
          </p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="field"
            onChange={(e) => onPhotosSelected(e.target.files)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {photos.map((p, i) => (
              <div key={p.storageKey} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-40 w-full rounded-sm object-cover" />
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
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!photos.length || loading}
              onClick={() => setStep(3)}
            >
              Continue to analysis
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="panel space-y-4 rounded-sm p-6">
          <p className="text-sm text-[var(--steel)]">
            We will detect damaged parts and suggest repair vs replace. You can edit lines on the next step.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="button" className="btn-primary" disabled={loading} onClick={onAnalyze}>
              {loading ? "Analyzing…" : "Run AI analysis"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && session && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {photos.map((p, i) => (
              <PhotoWithOverlays key={p.storageKey} url={p.url} boxes={overlaysByPhoto[i] ?? []} />
            ))}
          </div>

          <div className="panel rounded-sm p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {(["OEM", "AFTERMARKET", "MIXED"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`rounded-sm px-3 py-1.5 text-xs ${mode === m ? "bg-[var(--copper)] text-white" : "border border-[var(--line)] text-[var(--steel)]"}`}
                  onClick={() => onMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-lg font-semibold text-[var(--mist)]">
              Estimated range: ${session.rangeLow?.toFixed(0) ?? "—"} – ${session.rangeHigh?.toFixed(0) ?? "—"}
            </p>
            <p className="text-sm text-[var(--steel)]">
              Confidence: {session.confidence != null ? `${Math.round(session.confidence * 100)}%` : "—"}
            </p>
          </div>

          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.id} className="panel rounded-sm p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--mist)]">{l.partName}</p>
                    <p className="text-[var(--steel)]">
                      {l.operation} · {l.severity ?? "—"} · {l.side ?? "—"}
                      {l.confidence != null ? ` · ${Math.round(l.confidence * 100)}%` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--steel)]">
                      OEM: {l.oemPrice != null ? `$${l.oemPrice}` : "data needed"} · AM:{" "}
                      {l.aftermarketPrice != null ? `$${l.aftermarketPrice}` : "data needed"}
                      {l.capaCertified ? " · CAPA" : ""}
                    </p>
                  </div>
                  <select
                    className="field max-w-[140px] text-xs"
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

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep(5)}>
              Agree & book inspection
            </button>
            <a className="btn-ghost" href={`/api/v1/damage-estimate/sessions/${session.id}/pdf`} target="_blank" rel="noreferrer">
              Download estimate PDF
            </a>
          </div>
        </div>
      )}

      {step === 5 && (
        <form className="panel space-y-3 rounded-sm p-6" onSubmit={onBook}>
          <p className="text-sm text-[var(--steel)]">Pick a time — we create a shop appointment linked to this estimate.</p>
          <input className="field" required placeholder="Full name" value={bookForm.name} onChange={(e) => setBookForm({ ...bookForm, name: e.target.value })} />
          <input className="field" required placeholder="Phone" value={bookForm.phone} onChange={(e) => setBookForm({ ...bookForm, phone: e.target.value })} />
          <input className="field" required type="email" placeholder="Email" value={bookForm.email} onChange={(e) => setBookForm({ ...bookForm, email: e.target.value })} />
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
          <div className="flex gap-2">
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
        <div className="panel space-y-4 rounded-sm p-6">
          <h2 className="text-xl font-semibold text-[var(--mist)]">You&apos;re booked</h2>
          {trackingId && <p className="text-sm text-[var(--steel)]">Tracking ID: <strong className="text-[var(--mist)]">{trackingId}</strong></p>}
          <p className="text-sm text-[var(--steel)]">
            Estimate range: ${session?.rangeLow?.toFixed(0) ?? "—"} – ${session?.rangeHigh?.toFixed(0) ?? "—"}
          </p>
          {session && (
            <a className="btn-primary inline-flex" href={`/api/v1/damage-estimate/sessions/${session.id}/pdf`} target="_blank" rel="noreferrer">
              Download PDF summary
            </a>
          )}
          <p className="text-xs text-[var(--steel)]">
            This is a preliminary estimate until a technician inspects the vehicle.
          </p>
          <Link href="/track" className="text-sm text-[var(--copper-hot)]">
            Track your visit →
          </Link>
        </div>
      )}
    </div>
  );
}
