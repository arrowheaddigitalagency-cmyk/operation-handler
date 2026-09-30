import type {
  LaborOperation,
  LaborTimeProvider,
  LaborTimeQuote,
  PaintType,
  Severity,
} from "../types.js";
import { MockLaborTimeProvider } from "./mock.js";

type OlpLaborRow = {
  job?: string;
  jobSlug?: string;
  category?: string;
  hours?: number;
  lowRange?: number;
  highRange?: number;
  confidence?: string;
};

/**
 * Open Labor Project — free Hobbyist API for book labor times.
 * Docs: https://openlaborproject.com/docs/api/
 * Best effort for collision panel jobs; falls back to mock hours if no match.
 */
export class OpenLaborTimeProvider implements LaborTimeProvider {
  readonly name = "openlabor";
  private readonly mock = new MockLaborTimeProvider();
  private cache = new Map<string, OlpLaborRow[]>();

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://openlaborproject.com",
  ) {}

  async quote(input: {
    partName: string;
    operation: LaborOperation;
    severity: Severity;
    paintType?: PaintType;
    year?: string | null;
    make?: string | null;
    model?: string | null;
    vin?: string | null;
  }): Promise<LaborTimeQuote> {
    const fallback = await this.mock.quote(input);
    if (!this.apiKey?.trim()) {
      return { ...fallback, provider: this.name, isSample: true };
    }

    const rows = await this.fetchLaborTimes(input);
    const match = pickBestJob(rows, input.partName, input.operation);
    if (!match?.hours || match.hours <= 0) {
      return {
        ...fallback,
        provider: this.name,
        isSample: true,
      };
    }

    const hours = Number(match.hours);
    const sevMul = input.severity === "light" ? 0.85 : input.severity === "heavy" ? 1.2 : 1;
    const bodyHours =
      input.operation === "replace" || input.operation === "repair" || input.operation === "r_and_i"
        ? round2(hours * sevMul)
        : round2(Math.min(hours, 1.2));
    let refinishHours = fallback.refinishHours;
    let blendHours = fallback.blendHours;
    if (input.operation === "refinish") {
      refinishHours = round2(hours * sevMul);
    } else if (input.operation === "blend") {
      blendHours = round2(hours * sevMul);
    } else if (input.operation === "replace" || input.operation === "repair") {
      // Keep paint hours from collision heuristics; body from OLP when matched
      refinishHours = fallback.refinishHours;
      blendHours = fallback.blendHours;
    }
    if (input.paintType === "three_stage") refinishHours = round2(refinishHours * 1.35);

    return {
      partName: input.partName,
      operation: input.operation,
      bodyHours,
      structuralHours: fallback.structuralHours,
      mechanicalHours: fallback.mechanicalHours,
      refinishHours,
      blendHours,
      isSample: (match.confidence ?? "").toLowerCase() === "estimated",
      provider: this.name,
    };
  }

  private async fetchLaborTimes(input: {
    year?: string | null;
    make?: string | null;
    model?: string | null;
    vin?: string | null;
  }): Promise<OlpLaborRow[]> {
    const make = slug(input.make);
    const model = slug(input.model);
    const year = (input.year ?? "").toString().trim();
    const vin = (input.vin ?? "").trim().toUpperCase();

    let cacheKey: string;
    let url: URL;
    if (vin.length === 17) {
      cacheKey = `vin:${vin}`;
      url = new URL("/api/v1/labor-times", this.baseUrl);
      url.searchParams.set("vin", vin);
    } else if (make && model && year) {
      cacheKey = `${make}|${model}|${year}`;
      url = new URL("/api/v1/labor-times", this.baseUrl);
      url.searchParams.set("make", make);
      url.searchParams.set("model", model);
      url.searchParams.set("year", year);
    } else {
      return [];
    }

    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    try {
      const res = await fetch(url.toString(), {
        headers: { "x-api-key": this.apiKey, Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: {
          laborTimes?: OlpLaborRow[];
          engines?: { laborTimes?: OlpLaborRow[] }[];
        };
        laborTimes?: OlpLaborRow[];
      };
      const nested =
        json.data?.engines?.flatMap((e) => e.laborTimes ?? []) ?? [];
      const rows = json.data?.laborTimes ?? json.laborTimes ?? nested;
      this.cache.set(cacheKey, rows);
      return rows;
    } catch {
      return [];
    }
  }
}

function slug(v?: string | null): string {
  return (v ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pickBestJob(rows: OlpLaborRow[], partName: string, op: LaborOperation): OlpLaborRow | null {
  if (!rows.length) return null;
  const part = partName.toLowerCase();
  const tokens = collisionTokens(part);
  if (!tokens.length) return null;

  const opWords =
    op === "replace"
      ? ["replace", "r&r", "remove and replace", "r and r"]
      : op === "repair"
        ? ["repair", "overhaul", "section"]
        : op === "r_and_i"
          ? ["r&i", "remove and install", "r and i"]
          : op === "refinish"
            ? ["refinish", "paint", "spray"]
            : ["blend"];

  let best: OlpLaborRow | null = null;
  let bestScore = 0;
  for (const row of rows) {
    const job = `${row.job ?? ""} ${row.jobSlug ?? ""} ${row.category ?? ""}`.toLowerCase();
    let score = 0;
    for (const t of tokens) if (job.includes(t)) score += 2;
    for (const w of opWords) if (job.includes(w)) score += 1;
    // Prefer body/collision-ish categories
    if (/body|collision|panel|paint|bump|fender|door|hood|quarter|lamp|glass|mirror/.test(job)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return bestScore >= 2 ? best : null;
}

function collisionTokens(part: string): string[] {
  const out: string[] = [];
  const map: [RegExp, string[]][] = [
    [/bumper/, ["bumper"]],
    [/fender/, ["fender"]],
    [/hood/, ["hood"]],
    [/door/, ["door"]],
    [/quarter/, ["quarter"]],
    [/trunk|deck|lid/, ["trunk", "decklid", "deck lid"]],
    [/headlamp|headlight|lamp/, ["headlamp", "headlight", "lamp"]],
    [/taillamp|taillight/, ["taillamp", "taillight"]],
    [/mirror/, ["mirror"]],
    [/grille|grill/, ["grille", "grill"]],
    [/windshield|glass/, ["windshield", "glass"]],
    [/roof/, ["roof"]],
  ];
  for (const [re, toks] of map) {
    if (re.test(part)) out.push(...toks);
  }
  if (/front/.test(part)) out.push("front");
  if (/rear|back/.test(part)) out.push("rear");
  if (/left|lh/.test(part)) out.push("left", "lh");
  if (/right|rh/.test(part)) out.push("right", "rh");
  return [...new Set(out)];
}
