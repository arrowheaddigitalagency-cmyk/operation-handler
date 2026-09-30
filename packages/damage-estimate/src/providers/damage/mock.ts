import { randomUUID } from "crypto";
import type {
  DamageAnalyzeInput,
  DamageAnalyzeResult,
  DamageDetection,
  DamageProvider,
} from "../types.js";

/**
 * MOCK damage provider — deterministic sample detections for UI E2E.
 * TODO: swap via DAMAGE_PROVIDER=yolo|vision_llm|tractable
 */
export class MockDamageProvider implements DamageProvider {
  readonly name = "mock";

  async analyze(input: DamageAnalyzeInput): Promise<DamageAnalyzeResult> {
    const imageCount = Math.max(1, input.imageUrls.length);
    const detections: DamageDetection[] = [
      {
        id: randomUUID(),
        partName: "Front bumper cover",
        side: "front",
        damageType: "scratch",
        severity: "medium",
        operation: "repair",
        confidence: 0.82,
        imageIndex: 0,
        bbox: { x: 0.28, y: 0.55, w: 0.44, h: 0.22 },
      },
      {
        id: randomUUID(),
        partName: "Left front fender",
        side: "left",
        damageType: "dent",
        severity: "heavy",
        operation: "replace",
        confidence: 0.76,
        imageIndex: Math.min(1, imageCount - 1),
        bbox: { x: 0.08, y: 0.32, w: 0.3, h: 0.35 },
      },
      {
        id: randomUUID(),
        partName: "Hood",
        side: "front",
        damageType: "paint_damage",
        severity: "light",
        operation: "refinish",
        confidence: 0.71,
        imageIndex: 0,
        bbox: { x: 0.3, y: 0.2, w: 0.4, h: 0.28 },
      },
      {
        id: randomUUID(),
        partName: "Left headlamp",
        side: "left",
        damageType: "crack",
        severity: "heavy",
        operation: "replace",
        confidence: 0.88,
        imageIndex: Math.min(1, imageCount - 1),
        bbox: { x: 0.12, y: 0.4, w: 0.18, h: 0.16 },
      },
    ];

    return {
      provider: this.name,
      isSample: true,
      detections,
      notes: [
        "SAMPLE DATA — mock AI detections for demo only",
        "Replace MockDamageProvider with YOLO / vision LLM / Tractable for production",
      ],
      analyzedAt: new Date().toISOString(),
    };
  }
}
