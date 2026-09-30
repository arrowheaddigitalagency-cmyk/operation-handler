import { randomUUID } from "crypto";
import type {
  DamageDetection,
  DamageType,
  LaborOperation,
  Severity,
} from "../types.js";

export type GeminiDet = {
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

export function damageVisionPrompt(imageIndex: number, vehicleJson: string): string {
  return `You are an expert auto-body collision estimator doing a photo-by-photo inspection.
This is photo index ${imageIndex} only. Inspect the WHOLE frame carefully.
Report EVERY visible exterior defect, including light ones: scuffs, paint transfer, clear-coat scratches, small dents, creases, chips, cracked lenses, misaligned panels, torn bumper, missing trim.
One photo may have MULTIPLE damaged parts — list each as its own detection.
Do NOT invent damage that is not visible. Only return empty detections if the panel truly looks undamaged.

CRITICAL bbox rules (normalized 0–1, origin top-left of THIS photo):
- bbox = tight box around the VISIBLE damage pixels only (the scratch/dent/scuff), never the whole car.
- Never place a bbox on asphalt/ground, sky, or empty background. If damage is on a body panel, the box must sit on painted metal/plastic.
- Front bumper / bumper cover: box must sit on the bumper fascia — usually LOWER third (center y ≥ 0.55). NEVER on headlamp, grille, or hood.
- Headlamp damage: partName must be headlamp/headlight and box on the lamp only.
- Door / fender / quarter side damage: box on the panel face mid-height (center y roughly 0.35–0.75), never below the rocker onto the ground.
- Prefer a smaller accurate box over a large guessed box.

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
      "description": "short — where on the panel"
    }
  ]
}
Vehicle: ${vehicleJson}.`;
}

export function parseDetectionsJson(
  raw: string,
  imageIndex: number,
): { detections: DamageDetection[]; notes: string[] } {
  const notes: string[] = [];
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
    notes.push(`Photo[${imageIndex}]: no damage reported`);
  } else {
    notes.push(`Photo[${imageIndex}]: ${detections.length} detection(s)`);
  }
  return { detections, notes };
}

export function normalizeDet(d: GeminiDet, forcedIndex: number): DamageDetection {
  const rawBbox = d.bbox
    ? {
        x: clamp01(Number(d.bbox.x)),
        y: clamp01(Number(d.bbox.y)),
        w: clamp01(Number(d.bbox.w)),
        h: clamp01(Number(d.bbox.h)),
      }
    : undefined;
  const partName = d.partName.trim();
  return {
    id: randomUUID(),
    partName,
    side: normalizeSide(d.side),
    damageType: normalizeDamageType(d.damageType),
    severity: normalizeSeverity(d.severity),
    operation: normalizeOp(d.operation, d.severity),
    confidence: clamp01(Number(d.confidence) || 0.7),
    imageIndex: forcedIndex,
    bbox: rawBbox ? sanitizeBbox(partName, rawBbox) : undefined,
  };
}

/** Correct common vision bbox mistakes (bumper on lamp, door on ground, etc.). */
function sanitizeBbox(
  partName: string,
  bbox: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = bbox;
  // Keep boxes from blowing up to full-frame
  w = Math.min(w, 0.55);
  h = Math.min(h, 0.45);
  if (w < 0.04) w = 0.12;
  if (h < 0.04) h = 0.1;

  const name = partName.toLowerCase();
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (/bumper/.test(name)) {
    // Bumper damage lives low — pull high boxes down off lamps/grille
    if (cy < 0.52) {
      y = 0.58;
      h = Math.min(h, 0.28);
    }
    if (y + h > 0.98) y = Math.max(0.55, 0.98 - h);
  } else if (/door|fender|quarter|rocker|panel/.test(name)) {
    // Side panels mid-body — pull boxes off asphalt
    if (cy > 0.82 || y > 0.78) {
      y = 0.38;
      h = Math.min(Math.max(h, 0.14), 0.32);
    }
    if (cy < 0.22) {
      y = 0.32;
    }
  } else if (/hood/.test(name)) {
    if (cy > 0.55) {
      y = 0.12;
      h = Math.min(h, 0.28);
    }
  } else if (/headlamp|headlight|taillamp|taillight|lamp/.test(name)) {
    // Lamps sit mid-front; avoid ground
    if (cy > 0.75) {
      y = 0.32;
      h = Math.min(h, 0.18);
    }
  }

  x = clamp01(x);
  y = clamp01(y);
  if (x + w > 1) w = 1 - x;
  if (y + h > 1) h = 1 - y;
  // Prefer left-of-center for left sides when box drifted right on front bumper corners
  void cx;
  return { x, y, w: clamp01(w), h: clamp01(h) };
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function clamp01(n: number): number {
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

const SEV_RANK: Record<Severity, number> = { light: 1, medium: 2, heavy: 3 };

/** Merge two detection lists for the same photo set — union + keep stronger duplicate. */
export function mergeDetections(
  primary: DamageDetection[],
  secondary: DamageDetection[],
): DamageDetection[] {
  const out = primary.map((d) => ({ ...d }));
  for (const d of secondary) {
    const idx = out.findIndex((x) => isSameDamage(x, d));
    if (idx < 0) {
      out.push({ ...d });
      continue;
    }
    const cur = out[idx]!;
    const prefer =
      d.confidence > cur.confidence ||
      (d.confidence === cur.confidence && SEV_RANK[d.severity] > SEV_RANK[cur.severity]);
    if (prefer) {
      out[idx] = {
        ...d,
        // keep both signals when useful
        confidence: Math.max(d.confidence, cur.confidence),
        severity: SEV_RANK[d.severity] >= SEV_RANK[cur.severity] ? d.severity : cur.severity,
        bbox: d.bbox ?? cur.bbox,
      };
    } else {
      out[idx] = {
        ...cur,
        confidence: Math.max(d.confidence, cur.confidence),
        severity: SEV_RANK[d.severity] > SEV_RANK[cur.severity] ? d.severity : cur.severity,
        bbox: cur.bbox ?? d.bbox,
      };
    }
  }
  return out;
}

function isSameDamage(a: DamageDetection, b: DamageDetection): boolean {
  if (a.imageIndex !== b.imageIndex) return false;
  if (normPart(a.partName) !== normPart(b.partName)) return false;
  const sideOk =
    a.side === b.side || a.side === "unknown" || b.side === "unknown";
  if (!sideOk) return false;
  // Same part + overlapping bbox → duplicate; no bbox → same part on same photo
  if (a.bbox && b.bbox) return iou(a.bbox, b.bbox) >= 0.25;
  return true;
}

function normPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(left|right|front|rear|lh|rh)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function iou(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}
