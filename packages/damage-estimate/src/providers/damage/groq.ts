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
 * Groq vision (OpenAI-compatible) — free-tier multimodal models e.g. qwen/qwen3.8-27b.
 */
export class GroqDamageProvider implements DamageProvider {
  readonly name = "groq";

  constructor(
    private readonly apiKey: string,
    private readonly model = "qwen/qwen3.8-27b",
  ) {}

  async analyze(input: DamageAnalyzeInput): Promise<DamageAnalyzeResult> {
    if (!this.apiKey?.trim()) {
      throw new Error("GROQ_API_KEY required for groq damage provider");
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

    // Sequential — free-tier friendly
    for (let i = 0; i < input.imageUrls.length; i++) {
      const r = await this.analyzeOneWithRetry(input.imageUrls[i]!, i, input);
      detections.push(...r.detections);
      notes.push(...r.notes);
      if (i < input.imageUrls.length - 1) await sleep(400);
    }

    if (!detections.length) {
      throw new Error(`Groq found no detections. ${notes.slice(0, 4).join(" | ")}`);
    }

    return {
      provider: this.name,
      isSample: false,
      detections,
      notes: [
        ...notes,
        `Groq sequential scan: ${input.imageUrls.length} image(s), ${detections.length} detection(s)`,
      ],
      analyzedAt: new Date().toISOString(),
    };
  }

  async analyzePhoto(
    imageUrl: string,
    imageIndex: number,
    input: DamageAnalyzeInput,
  ): Promise<{ detections: DamageDetection[]; notes: string[] }> {
    if (!this.apiKey?.trim()) {
      return { detections: [], notes: [`Photo[${imageIndex}] Groq skipped: no API key`] };
    }
    return this.analyzeOneWithRetry(imageUrl, imageIndex, input);
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
        const retryable = /503|429|rate|timeout|temporar|overloaded/i.test(lastErr);
        if (!retryable || attempt === maxAttempts) break;
        await sleep(900 * attempt * attempt);
      }
    }
    return {
      detections: [],
      notes: [`Photo[${imageIndex}] Groq failed after retries: ${lastErr.slice(0, 180)}`],
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
    // Groq free vision often caps ~4MB base64 payloads — shrink note if huge
    if (buf.byteLength > 3.5 * 1024 * 1024) {
      notes.push(`Photo[${imageIndex}] large (${Math.round(buf.byteLength / 1024)}KB); Groq may reject`);
    }
    const mime = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0]!;
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: damageVisionPrompt(imageIndex, JSON.stringify(input.vehicle ?? {})) },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${text.slice(0, 220)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    if (!raw.trim()) {
      notes.push(`Photo[${imageIndex}]: empty Groq response`);
      return { detections: [], notes };
    }

    const parsed = parseDetectionsJson(raw, imageIndex);
    return { detections: parsed.detections, notes: [...notes, ...parsed.notes.map((n) => `Groq ${n}`)] };
  }
}
