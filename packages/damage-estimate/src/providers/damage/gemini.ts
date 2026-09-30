import type {
  DamageAnalyzeInput,
  DamageAnalyzeResult,
  DamageDetection,
  DamageProvider,
} from "../types.js";
import {
  damageVisionPrompt,
  parseDetectionsJson,
  sleep,
} from "./vision-shared.js";

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

  /** Single-photo analyze for ensemble (no throw on empty). */
  async analyzePhoto(
    imageUrl: string,
    imageIndex: number,
    input: DamageAnalyzeInput,
  ): Promise<{ detections: DamageDetection[]; notes: string[] }> {
    if (!this.apiKey?.trim()) {
      return { detections: [], notes: [`Photo[${imageIndex}] Gemini skipped: no API key`] };
    }
    return this.analyzeOneWithRetry(imageUrl, imageIndex, input);
  }

  private async analyzeOneWithRetry(
    imageUrl: string,
    imageIndex: number,
    input: DamageAnalyzeInput,
  ): Promise<{ detections: DamageDetection[]; notes: string[] }> {
    const maxAttempts = 4;
    let lastErr = "";
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.analyzeOne(imageUrl, imageIndex, input);
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "error";
        const retryable = /503|UNAVAILABLE|high demand|temporarily|429|RESOURCE_EXHAUSTED/i.test(lastErr);
        if (!retryable || attempt === maxAttempts) break;
        // Free-tier 429 needs longer cool-down than 503
        const base = /429|RESOURCE_EXHAUSTED|quota/i.test(lastErr) ? 4000 : 900;
        await sleep(base * attempt * attempt);
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: damageVisionPrompt(imageIndex, JSON.stringify(input.vehicle ?? {})) },
              { inline_data: { mime_type: mime, data: buf.toString("base64") } },
            ],
          },
        ],
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

    const parsed = parseDetectionsJson(raw, imageIndex);
    return { detections: parsed.detections, notes: [...notes, ...parsed.notes.map((n) => `Gemini ${n}`)] };
  }
}
