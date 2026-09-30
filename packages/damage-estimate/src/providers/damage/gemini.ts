import { randomUUID } from "crypto";
import type {
  DamageAnalyzeInput,
  DamageAnalyzeResult,
  DamageDetection,
  DamageProvider,
  DamageType,
  LaborOperation,
  Severity,
} from "../types.js";

type GeminiDet = {
  imageIndex: number;
  partName: string;
  side?: string;
  damageType?: string;
  severity?: string;
  operation?: string;
  confidence?: number;
  bbox?: { x: number; y: number; w: number; h: number };
  description?: string;
};

/**
 * Gemini vision — inspects EVERY uploaded photo and returns per-image detections.
 */
export class GeminiDamageProvider implements DamageProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-2.0-flash",
  ) {}

  async analyze(input: DamageAnalyzeInput): Promise<DamageAnalyzeResult> {
    if (!this.apiKey?.trim()) {
      throw new Error("GEMINI_API_KEY required for gemini damage provider");
    }
    if (!input.imageUrls.length) {
      return {
        provider: this.name,
        isSample: false,
        detections: [],
        notes: ["No images provided"],
        analyzedAt: new Date().toISOString(),
      };
    }

    const parts: Array<Record<string, unknown>> = [
      {
        text: `You are an expert auto-body collision estimator (CCC ONE style).
Inspect EVERY photo below. Photos are indexed starting at 0 in the order provided.
Find ALL visible damage on the vehicle exterior: dents, scratches, scuffs, paint chips, cracks, broken lamps, glass, bumper damage, door/rocker/quarter damage, etc.
Do NOT invent damage that is not visible. Do NOT skip a photo — if a photo shows damage, emit detections with that imageIndex.
If a photo shows no clear damage, emit nothing for that index.

Return STRICT JSON only (no markdown):
{
  "detections": [
    {
      "imageIndex": 0,
      "partName": "Front bumper cover",
      "side": "front"|"left"|"right"|"rear"|"center"|"unknown",
      "damageType": "dent"|"scratch"|"crack"|"tear"|"paint_damage"|"glass",
      "severity": "light"|"medium"|"heavy",
      "operation": "repair"|"replace"|"refinish"|"blend"|"r_and_i",
      "confidence": 0.0-1.0,
      "bbox": { "x": 0-1, "y": 0-1, "w": 0-1, "h": 0-1 },
      "description": "short"
    }
  ],
  "notes": ["optional"]
}
bbox is normalized 0-1 relative to that image. Prefer one detection per distinct damaged part per photo.
Vehicle hint: ${JSON.stringify(input.vehicle ?? {})}.
Paint: ${input.paintType ?? "unknown"} ${input.paintCode ?? ""}.`,
      },
    ];

    const notes: string[] = [];
    for (let i = 0; i < input.imageUrls.length; i++) {
      const url = input.imageUrls[i]!;
      try {
        const imgRes = await fetch(url);
        if (!imgRes.ok) {
          notes.push(`Could not fetch image[${i}]: HTTP ${imgRes.status}`);
          continue;
        }
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const mime = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0]!;
        parts.push({ text: `Photo index ${i} of ${input.imageUrls.length - 1}:` });
        parts.push({
          inline_data: {
            mime_type: mime,
            data: buf.toString("base64"),
          },
        });
      } catch (e) {
        notes.push(`Could not fetch image[${i}]: ${e instanceof Error ? e.message : "error"}`);
      }
    }

    if (parts.length < 2) {
      return {
        provider: this.name,
        isSample: false,
        detections: [],
        notes: [...notes, "No images could be loaded for Gemini"],
        analyzedAt: new Date().toISOString(),
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini damage analyze failed: ${res.status} ${text.slice(0, 400)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!raw.trim()) throw new Error("Gemini returned empty damage JSON");

    let parsed: { detections?: GeminiDet[]; notes?: string[] };
    try {
      parsed = JSON.parse(raw) as { detections?: GeminiDet[]; notes?: string[] };
    } catch {
      throw new Error("Gemini returned invalid JSON for damage detections");
    }

    const maxIdx = Math.max(0, input.imageUrls.length - 1);
    const detections: DamageDetection[] = (parsed.detections ?? [])
      .filter((d) => d && typeof d.partName === "string" && d.partName.trim())
      .map((d) => normalizeDet(d, maxIdx));

    const seenIndexes = new Set(detections.map((d) => d.imageIndex));
    for (let i = 0; i < input.imageUrls.length; i++) {
      if (!seenIndexes.has(i)) notes.push(`No damage detections reported for photo index ${i}`);
    }

    return {
      provider: this.name,
      isSample: false,
      detections,
      notes: [
        ...notes,
        ...(parsed.notes ?? []),
        `Gemini inspected ${input.imageUrls.length} photo(s); ${detections.length} detection(s)`,
      ],
      analyzedAt: new Date().toISOString(),
    };
  }
}

function normalizeDet(d: GeminiDet, maxIdx: number): DamageDetection {
  const idx = clampInt(Number(d.imageIndex) || 0, 0, maxIdx);
  const bbox = d.bbox
    ? {
        x: clamp01(Number(d.bbox.x)),
        y: clamp01(Number(d.bbox.y)),
        w: clamp01(Number(d.bbox.w)),
        h: clamp01(Number(d.bbox.h)),
      }
    : undefined;
  return {
    id: randomUUID(),
    partName: d.partName.trim(),
    side: normalizeSide(d.side),
    damageType: normalizeDamageType(d.damageType),
    severity: normalizeSeverity(d.severity),
    operation: normalizeOp(d.operation, d.severity),
    confidence: clamp01(Number(d.confidence) || 0.7),
    imageIndex: idx,
    bbox,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function normalizeSide(s?: string): DamageDetection["side"] {
  const v = (s ?? "unknown").toLowerCase();
  if (["left", "right", "center", "front", "rear", "unknown"].includes(v)) {
    return v as DamageDetection["side"];
  }
  return "unknown";
}

function normalizeDamageType(s?: string): DamageType {
  const v = (s ?? "scratch").toLowerCase().replace(/\s+/g, "_");
  if (v.includes("dent")) return "dent";
  if (v.includes("scratch") || v.includes("scuff")) return "scratch";
  if (v.includes("crack")) return "crack";
  if (v.includes("tear")) return "tear";
  if (v.includes("glass")) return "glass";
  if (v.includes("paint") || v.includes("chip")) return "paint_damage";
  return "scratch";
}

function normalizeSeverity(s?: string): Severity {
  const v = (s ?? "medium").toLowerCase();
  if (v === "light" || v === "minor") return "light";
  if (v === "heavy" || v === "severe") return "heavy";
  return "medium";
}

function normalizeOp(op?: string, sev?: string): LaborOperation {
  const v = (op ?? "").toLowerCase().replace(/\s+/g, "_");
  if (v.includes("replace")) return "replace";
  if (v.includes("refinish") || v.includes("paint")) return "refinish";
  if (v.includes("blend")) return "blend";
  if (v.includes("r_and_i") || v.includes("r&i")) return "r_and_i";
  if (v.includes("repair")) return "repair";
  return normalizeSeverity(sev) === "heavy" ? "replace" : "repair";
}
