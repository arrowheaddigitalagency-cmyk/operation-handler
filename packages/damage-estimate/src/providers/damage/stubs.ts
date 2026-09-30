import type { DamageAnalyzeInput, DamageAnalyzeResult, DamageProvider } from "../types.js";

export class YoloDamageProvider implements DamageProvider {
  readonly name = "yolo";
  async analyze(_input: DamageAnalyzeInput): Promise<DamageAnalyzeResult> {
    throw new Error("Self-hosted YOLO DamageProvider not configured (TODO: YOLO_ENDPOINT)");
  }
}

export class VisionLlmDamageProvider implements DamageProvider {
  readonly name = "vision_llm";
  async analyze(_input: DamageAnalyzeInput): Promise<DamageAnalyzeResult> {
    throw new Error("Vision LLM DamageProvider not configured (TODO: VISION_LLM_API_KEY)");
  }
}

export class TractableDamageProvider implements DamageProvider {
  readonly name = "tractable";
  async analyze(_input: DamageAnalyzeInput): Promise<DamageAnalyzeResult> {
    throw new Error("Tractable DamageProvider not configured (TODO: TRACTABLE_API_KEY)");
  }
}
