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
  imageIndex?: number;
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
 * Gemini vision — parallel per-photo calls with 503 retries.
 * Returns partial detections if some photos succeed (does not fail the whole run).
 */
export class GeminiDamageProvider implements DamageProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-3.8-flash",
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

    const notes: string[] = [];
    const detections: DamageDetection[] = [];

    // Parallel (all photos) — keeps total time under Vercel/Railway proxy limits
    const results = await Promise.all(
      input.imageUrls.map((url, i) => this.analyzeOneWithRetry(url, i, input)),
    );

    for (const r of results) {
      detections.push(...r.detections);
      notes.push(...r.notes);
    }

    if (!detections.length) {
      throw new Error(`Gemini found no detections. ${notes.slice(0, 4).join(" | ")}`);
    }

    return {
      provider: this.name,
      isSample: false,
      detections,
      notes: [
        ...notes,
        `Gemini parallel scan: ${input.imageUrls.length} image(s), ${detections.length} detection(s)`,
      ],
      analyzedAt: new Date().toISOString(),
    };
  }

  private async analyzeOneWithRetry(
    imageUrl: string,
    imageIndex: number,
    input: DamageAnalyzeInput,
  ): Promise<{ detections: DamageDetection[]; notes: string[] }> {
    const maxAttempts = 3;
    let lastErr = "";
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.analyzeOne(imageUrl, imageIndex, input);
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "error";
        const retryable = /503|UNAVAILABLE|high demand|temporarily|429|RESOURCE_EXHAUSTED/i.test(lastErr);
        if (!retryable || attempt === maxAttempts) break;
        await sleep(800 * attempt * attempt);
      }
    }
    return {
      detections: [],
      notes: [`Photo[${imageIndex}] Gemini failed after retries: ${lastErr.slice(0, 180)}`],
    };
  }

  private async analyzeOne(
    imageUrl: string,
    imageIndex: number,
    input: DamageAnalyzeInput,
  ): Promise<{ detections: DamageDetection[]; notes: string[] }> {
    const notes: string[] = [];
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      notes.push(`Could not fetch image[${imageIndex}]: HTTP ${imgRes.status}`);
      return { detections: [], notes };
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const mime = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0]!;

    const parts: Array<Record<string, unknown>> = [
      {
        text: `You are an expert auto-body collision estimator.
This is photo index ${imageIndex} only. Find ALL visible exterior damage in THIS photo:
dents, scratches, scuffs, paint chips, cracks, broken lamps, glass, bumper, fender, door, rocker, quarter, hood, mirror, etc.
Do NOT invent damage. If nothing clear, return {"detections":[]}.

Return STRICT JSON only:
{
  "detections": [
    {
      "partName": "Rear door" or "Front bumper cover" etc,
      "side": "front"|"left"|"right"|"rear"|"center"|"unknown",
      "damageType": "dent"|"scratch"|"crack"|"tear"|"paint_damage"|"glass",
      "severity": "light"|"medium"|"heavy",
      "operation": "repair"|"replace"|"refinish"|"blend"|"r_and_i",
      "confidence": 0.0-1.0,
      "bbox": { "x": 0-1, "y": 0-1, "w": 0-1, "h": 0-1 },
      "description": "short"
    }
  ]
}
bbox normalized to THIS image. Vehicle: ${JSON.stringify(input.vehicle ?? {})}.`,
      },
      {
        inline_data: {
          mime_type: mime,
          data: buf.toString("base64"),
        },
      },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${text.slice(0, 220)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!raw.trim()) {
      notes.push(`Photo[${imageIndex}]: empty Gemini response`);
      return { detections: [], notes };
    }

    let parsed: { detections?: GeminiDet[] };
    try {
      parsed = JSON.parse(raw) as { detections?: GeminiDet[] };
    } catch {
      throw new Error(`invalid JSON on photo ${imageIndex}`);
    }

    const detections = (parsed.detections ?? [])
      .filter((d) => d && typeof d.partName === "string" && d.partName.trim())
      .map((d) => normalizeDet({ ...d, imageIndex }, imageIndex));

    if (!detections.length) {
      notes.push(`Photo[${imageIndex}]: no damage reported by Gemini`);
    } else {
      notes.push(`Photo[${imageIndex}]: ${detections.length} detection(s)`);
    }
    return { detections, notes };
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeDet(d: GeminiDet, forcedIndex: number): DamageDetection {
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
    imageIndex: forcedIndex,
    bbox,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
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
