import {
  AI_ESTIMATE_DISCLAIMER,
  type DamageAnalysisResult,
  type DamageFinding,
} from "@cc/domain";
import { z } from "zod";

export type VisionImageInput = {
  url?: string;
  base64?: string;
  mimeType: string;
};

export type DamageSkillInput = {
  images: VisionImageInput[];
  vehicleHint?: { make?: string; model?: string; year?: number };
  currency?: string;
};

export interface VisionProvider {
  readonly name: string;
  readonly modelVersion: string;
  analyzeDamage(input: DamageSkillInput): Promise<DamageAnalysisResult>;
}

const resultSchema = z.object({
  findings: z.array(
    z.object({
      part: z.string(),
      severity: z.enum(["minor", "moderate", "severe"]),
      description: z.string(),
    }),
  ),
  complexity: z.enum(["low", "medium", "high"]),
  durationDaysMin: z.number(),
  durationDaysMax: z.number(),
  costMin: z.number(),
  costMax: z.number(),
  currency: z.string(),
  confidence: z.number(),
  caveats: z.array(z.string()),
  summary: z.string(),
});

/** Deterministic mock for local/dev without API keys. */
export class MockVisionProvider implements VisionProvider {
  readonly name = "mock";
  readonly modelVersion = "mock-1.0";

  async analyzeDamage(input: DamageSkillInput): Promise<DamageAnalysisResult> {
    const count = Math.max(1, input.images.length);
    const findings: DamageFinding[] = [
      {
        part: "Front bumper",
        severity: count > 2 ? "severe" : "moderate",
        description: "Visible crack / deformation detected in uploaded imagery",
      },
      {
        part: "Left headlight",
        severity: "moderate",
        description: "Possible housing damage or misalignment",
      },
      {
        part: "Hood",
        severity: "minor",
        description: "Minor dent / paint disturbance",
      },
    ];

    return {
      findings,
      complexity: count > 3 ? "high" : "medium",
      durationDaysMin: 0,
      durationDaysMax: 0,
      costMin: 0,
      costMax: 0,
      currency: input.currency ?? "USD",
      confidence: count < 2 ? 0.42 : 0.72,
      caveats: [AI_ESTIMATE_DISCLAIMER],
      summary:
        "Detected front bumper damage, left headlight concern, and minor hood dent. Shop price bands will be applied for the advisory range." +
        (count < 2 ? " Additional angles recommended for higher confidence." : ""),
    };
  }
}

export class OpenAIVisionProvider implements VisionProvider {
  readonly name = "openai";
  readonly modelVersion: string;

  constructor(
    private readonly apiKey: string,
    model = "gpt-4o-mini",
  ) {
    this.modelVersion = model;
  }

  async analyzeDamage(input: DamageSkillInput): Promise<DamageAnalysisResult> {
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `You are an auto body damage assessor. Analyze vehicle damage photos and return STRICT JSON matching:
{"findings":[{"part":string,"severity":"minor"|"moderate"|"severe","description":string}],"complexity":"low"|"medium"|"high","durationDaysMin":0,"durationDaysMax":0,"costMin":0,"costMax":0,"currency":string,"confidence":number,"caveats":[string],"summary":string}
IMPORTANT: Set all cost and duration numbers to 0. Pricing is applied by the shop separately. Only identify visible damage parts and severity.
Vehicle hint: ${JSON.stringify(input.vehicleHint ?? {})}.
Do not invent unseen damage.`,
      },
    ];

    for (const img of input.images) {
      if (img.url) {
        content.push({ type: "image_url", image_url: { url: img.url } });
      } else if (img.base64) {
        content.push({
          type: "image_url",
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        });
      }
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelVersion,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI Vision failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("OpenAI Vision returned empty content");
    const parsed = resultSchema.parse(JSON.parse(raw));
    if (!parsed.caveats.includes(AI_ESTIMATE_DISCLAIMER)) {
      parsed.caveats.push(AI_ESTIMATE_DISCLAIMER);
    }
    return parsed;
  }
}

/** Google Gemini multimodal (vision) — use when you have a Gemini API key (no OpenAI required). */
export class GeminiVisionProvider implements VisionProvider {
  readonly name = "gemini";
  readonly modelVersion: string;

  constructor(
    private readonly apiKey: string,
    model = "gemini-2.0-flash",
  ) {
    this.modelVersion = model;
  }

  async analyzeDamage(input: DamageSkillInput): Promise<DamageAnalysisResult> {
    const parts: Array<Record<string, unknown>> = [
      {
        text: `You are an auto body damage assessor. Analyze vehicle damage photos and return STRICT JSON only (no markdown) matching:
{"findings":[{"part":string,"severity":"minor"|"moderate"|"severe","description":string}],"complexity":"low"|"medium"|"high","durationDaysMin":0,"durationDaysMax":0,"costMin":0,"costMax":0,"currency":string,"confidence":number,"caveats":[string],"summary":string}
IMPORTANT: Set all cost and duration numbers to 0. Pricing is applied by the shop separately. Only identify visible damage parts and severity.
Vehicle hint: ${JSON.stringify(input.vehicleHint ?? {})}.
Currency default: ${input.currency ?? "USD"}.
Do not invent unseen damage.`,
      },
    ];

    for (const img of input.images) {
      if (img.base64) {
        parts.push({
          inline_data: {
            mime_type: img.mimeType || "image/jpeg",
            data: img.base64,
          },
        });
      } else if (img.url) {
        // Fetch remote image (e.g. Cloudinary) into inline bytes for Gemini
        const imgRes = await fetch(img.url);
        if (!imgRes.ok) throw new Error(`Failed to fetch image for Gemini: ${imgRes.status}`);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const mime = imgRes.headers.get("content-type") || img.mimeType || "image/jpeg";
        parts.push({
          inline_data: {
            mime_type: mime.split(";")[0],
            data: buf.toString("base64"),
          },
        });
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.modelVersion)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini Vision failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!raw.trim()) throw new Error("Gemini Vision returned empty content");
    const parsed = resultSchema.parse(JSON.parse(raw));
    if (!parsed.caveats.includes(AI_ESTIMATE_DISCLAIMER)) {
      parsed.caveats.push(AI_ESTIMATE_DISCLAIMER);
    }
    return parsed;
  }
}

/** Channel-agnostic AI brain. Channels never call providers directly. */
export class AIOrchestrator {
  constructor(private readonly vision: VisionProvider) {}

  get providerMeta() {
    return { provider: this.vision.name, modelVersion: this.vision.modelVersion };
  }

  async runDamageAnalysis(input: DamageSkillInput): Promise<DamageAnalysisResult> {
    if (!input.images.length) {
      throw new Error("At least one image is required");
    }
    return this.vision.analyzeDamage(input);
  }
}

export function createAIOrchestrator(opts: {
  provider: "mock" | "openai" | "gemini";
  openaiApiKey?: string;
  openaiModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}): AIOrchestrator {
  if (opts.provider === "openai") {
    if (!opts.openaiApiKey) throw new Error("OPENAI_API_KEY required for openai provider");
    return new AIOrchestrator(
      new OpenAIVisionProvider(opts.openaiApiKey, opts.openaiModel),
    );
  }
  if (opts.provider === "gemini") {
    if (!opts.geminiApiKey) throw new Error("GEMINI_API_KEY required for gemini provider");
    return new AIOrchestrator(
      new GeminiVisionProvider(opts.geminiApiKey, opts.geminiModel),
    );
  }
  return new AIOrchestrator(new MockVisionProvider());
}

export { AI_ESTIMATE_DISCLAIMER };
