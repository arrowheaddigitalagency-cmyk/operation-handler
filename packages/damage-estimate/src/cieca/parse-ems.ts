/**
 * Best-effort CIECA EMS / BMS-ish text parser for benchmark uploads.
 * Real EMS is EDI-like; this extracts simple line patterns for demo comparison.
 * TODO: replace with a full CIECA EMS/BMS parser library when available.
 */

export type CiecaParsedLine = {
  partDescription: string;
  operation?: string;
  amount?: number;
  laborHours?: number;
  raw: string;
};

export type CiecaParseResult = {
  formatGuess: "ems" | "bms" | "unknown";
  lines: CiecaParsedLine[];
  total?: number;
  warnings: string[];
};

export function parseCiecaExport(text: string): CiecaParseResult {
  const warnings: string[] = [
    "Best-effort parser — not a certified CIECA EMS/BMS implementation",
  ];
  const formatGuess = /EMS|CIECA/i.test(text)
    ? "ems"
    : /BMS|Mitchell|Audatex|CCC/i.test(text)
      ? "bms"
      : "unknown";

  const lines: CiecaParsedLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length < 4) continue;
    // e.g. "Front Bumper Cover  REPLACE  485.00  1.5"
    const m = trimmed.match(
      /^(.+?)\s+(REPAIR|REPLACE|REFINISH|BLEND|R&I|R AND I)\s+\$?([\d,]+\.?\d*)\s*([\d.]+)?/i,
    );
    if (m) {
      lines.push({
        partDescription: m[1]!.trim(),
        operation: m[2]!.toUpperCase(),
        amount: parseFloat(m[3]!.replace(/,/g, "")),
        laborHours: m[4] ? parseFloat(m[4]) : undefined,
        raw: trimmed,
      });
      continue;
    }
    const money = trimmed.match(/^(.+?)\s+\$?([\d,]+\.\d{2})\s*$/);
    if (money && /bumper|fender|hood|door|panel|lamp|quarter|grill/i.test(money[1]!)) {
      lines.push({
        partDescription: money[1]!.trim(),
        amount: parseFloat(money[2]!.replace(/,/g, "")),
        raw: trimmed,
      });
    }
  }

  let total: number | undefined;
  const totalMatch = text.match(/TOTAL[:\s]+\$?([\d,]+\.?\d*)/i);
  if (totalMatch) total = parseFloat(totalMatch[1]!.replace(/,/g, ""));

  if (lines.length === 0) {
    warnings.push("No line items matched — paste plain-text export or improve parser");
  }

  return { formatGuess, lines, total, warnings };
}
