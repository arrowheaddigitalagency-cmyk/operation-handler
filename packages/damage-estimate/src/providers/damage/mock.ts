import { randomUUID } from "crypto";
import type {
  DamageAnalyzeInput,
  DamageAnalyzeResult,
  DamageDetection,
  DamageProvider,
} from "../types.js";

/**
 * MOCK damage provider — spreads sample boxes across ALL uploaded photos
 * so UI never looks like only the first 2 images were inspected.
 */
export class MockDamageProvider implements DamageProvider {
  readonly name = "mock";

  async analyze(input: DamageAnalyzeInput): Promise<DamageAnalyzeResult> {
    const n = Math.max(1, input.imageUrls.length);
    const templates: Omit<DamageDetection, "id" | "imageIndex">[] = [
      {
        partName: "Front bumper cover",
        side: "front",
        damageType: "scratch",
        severity: "medium",
        operation: "repair",
        confidence: 0.82,
        bbox: { x: 0.28, y: 0.55, w: 0.44, h: 0.22 },
      },
      {
        partName: "Left front fender",
        side: "left",
        damageType: "dent",
        severity: "heavy",
        operation: "replace",
        confidence: 0.76,
        bbox: { x: 0.08, y: 0.32, w: 0.3, h: 0.35 },
      },
      {
        partName: "Hood",
        side: "front",
        damageType: "paint_damage",
        severity: "light",
        operation: "refinish",
        confidence: 0.71,
        bbox: { x: 0.3, y: 0.2, w: 0.4, h: 0.28 },
      },
      {
        partName: "Left headlamp",
        side: "left",
        damageType: "crack",
        severity: "heavy",
        operation: "replace",
        confidence: 0.88,
        bbox: { x: 0.12, y: 0.4, w: 0.18, h: 0.16 },
      },
      {
        partName: "Right front fender",
        side: "right",
        damageType: "dent",
        severity: "medium",
        operation: "repair",
        confidence: 0.74,
        bbox: { x: 0.55, y: 0.35, w: 0.28, h: 0.3 },
      },
      {
        partName: "Rear door",
        side: "right",
        damageType: "dent",
        severity: "medium",
        operation: "repair",
        confidence: 0.79,
        bbox: { x: 0.42, y: 0.38, w: 0.28, h: 0.32 },
      },
      {
        partName: "Rocker panel",
        side: "right",
        damageType: "scratch",
        severity: "light",
        operation: "refinish",
        confidence: 0.7,
        bbox: { x: 0.35, y: 0.68, w: 0.4, h: 0.12 },
      },
    ];

    const detections: DamageDetection[] = templates.slice(0, Math.max(4, n + 2)).map((t, i) => ({
      ...t,
      id: randomUUID(),
      imageIndex: i % n,
    }));

    // Guarantee every photo index gets at least one box
    for (let i = 0; i < n; i++) {
      if (!detections.some((d) => d.imageIndex === i)) {
        detections.push({
          id: randomUUID(),
          partName: "Body panel",
          side: "unknown",
          damageType: "scratch",
          severity: "light",
          operation: "refinish",
          confidence: 0.65,
          imageIndex: i,
          bbox: { x: 0.25, y: 0.3, w: 0.4, h: 0.35 },
        });
      }
    }

    return {
      provider: this.name,
      isSample: true,
      detections,
      notes: [
        "SAMPLE DATA — mock AI (not real vision). Set DAMAGE_PROVIDER=gemini + GEMINI_API_KEY for real per-photo inspection.",
      ],
      analyzedAt: new Date().toISOString(),
    };
  }
}
