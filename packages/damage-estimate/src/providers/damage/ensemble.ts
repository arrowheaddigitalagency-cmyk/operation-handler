import type {
  DamageAnalyzeInput,
  DamageAnalyzeResult,
  DamageDetection,
  DamageProvider,
} from "../types.js";
import { GeminiDamageProvider } from "./gemini.js";
import { GroqDamageProvider } from "./groq.js";
import { mergeDetections, sleep } from "./vision-shared.js";

/**
 * Sequential per-photo dual scan: Gemini + Groq, merge best detections.
 * If one provider fails on a photo, the other still contributes.
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
      `Ensemble: sequential dual-scan (${this.gemini ? "Gemini" : ""}${this.gemini && this.groq ? "+" : ""}${this.groq ? "Groq" : ""}) over ${input.imageUrls.length} photo(s)`,
    ];
    const detections: DamageDetection[] = [];

    for (let i = 0; i < input.imageUrls.length; i++) {
      const url = input.imageUrls[i]!;
      let geminiDets: DamageDetection[] = [];
      let groqDets: DamageDetection[] = [];

      if (this.gemini) {
        const g = await this.gemini.analyzePhoto(url, i, input);
        geminiDets = g.detections;
        notes.push(...g.notes);
      }
      if (this.groq) {
        // slight stagger to reduce dual free-tier bursts
        await sleep(250);
        const q = await this.groq.analyzePhoto(url, i, input);
        groqDets = q.detections;
        notes.push(...q.notes);
      }

      const merged = mergeDetections(geminiDets, groqDets);
      detections.push(...merged);
      notes.push(
        `Photo[${i}] merge: Gemini ${geminiDets.length} + Groq ${groqDets.length} → ${merged.length}`,
      );

      if (i < input.imageUrls.length - 1) await sleep(500);
    }

    if (!detections.length) {
      throw new Error(`Ensemble found no detections. ${notes.slice(-6).join(" | ")}`);
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
