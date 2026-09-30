import type {
  DamageAnalyzeInput,
  DamageAnalyzeResult,
  DamageDetection,
  DamageProvider,
} from "../types.js";
import { GeminiDamageProvider } from "./gemini.js";
import { GroqDamageProvider } from "./groq.js";
import { sleep } from "./vision-shared.js";

/**
 * Sequential per-photo scan with free-tier friendly failover:
 * try Gemini first; if empty/failed, try Groq. Avoids dual 429 bursts.
 */
export class EnsembleDamageProvider implements DamageProvider {
  readonly name = "ensemble";
  private readonly gemini: GeminiDamageProvider | null;
  private readonly groq: GroqDamageProvider | null;

  constructor(opts: {
    geminiApiKey?: string;
    geminiModel?: string;
    groqApiKey?: string;
    groqModel?: string;
  }) {
    this.gemini = opts.geminiApiKey?.trim()
      ? new GeminiDamageProvider(opts.geminiApiKey, opts.geminiModel)
      : null;
    this.groq = opts.groqApiKey?.trim()
      ? new GroqDamageProvider(opts.groqApiKey, opts.groqModel)
      : null;
  }

  async analyze(input: DamageAnalyzeInput): Promise<DamageAnalyzeResult> {
    if (!this.gemini && !this.groq) {
      throw new Error("Ensemble needs GEMINI_API_KEY and/or GROQ_API_KEY");
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

    const notes: string[] = [
      `Ensemble failover scan over ${input.imageUrls.length} photo(s)`,
    ];
    const detections: DamageDetection[] = [];
    let geminiQuotaHit = false;
    let groqQuotaHit = false;

    for (let i = 0; i < input.imageUrls.length; i++) {
      const url = input.imageUrls[i]!;
      let chosen: DamageDetection[] = [];
      let source = "none";

      if (this.gemini && !geminiQuotaHit) {
        const g = await this.gemini.analyzePhoto(url, i, input);
        notes.push(...g.notes);
        if (g.notes.some((n) => /429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(n))) {
          geminiQuotaHit = true;
        }
        if (g.detections.length) {
          chosen = g.detections;
          source = "gemini";
        }
      }

      if (!chosen.length && this.groq && !groqQuotaHit) {
        await sleep(1200);
        const q = await this.groq.analyzePhoto(url, i, input);
        notes.push(...q.notes);
        if (q.notes.some((n) => /429|quota|rate limit/i.test(n))) {
          groqQuotaHit = true;
        }
        if (q.detections.length) {
          chosen = q.detections;
          source = "groq";
        }
      }

      // Last resort: if primary was empty (not quota) and secondary also empty, already noted
      detections.push(...chosen);
      notes.push(`Photo[${i}] used ${source}: ${chosen.length} detection(s)`);

      // Free-tier pacing between photos
      if (i < input.imageUrls.length - 1) {
        const pause = geminiQuotaHit || groqQuotaHit ? 3500 : 1800;
        await sleep(pause);
      }
    }

    if (!detections.length) {
      throw new Error(
        `No damage found after scanning ${input.imageUrls.length} photo(s). Free API quota may be exhausted — wait a few minutes and retry.`,
      );
    }

    return {
      provider: this.name,
      isSample: false,
      detections,
      notes: [
        ...notes,
        `Ensemble total: ${input.imageUrls.length} image(s), ${detections.length} detection(s)`,
      ],
      analyzedAt: new Date().toISOString(),
    };
  }
}
