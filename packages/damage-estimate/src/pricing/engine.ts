import type {
  EstimateLineInput,
  PricedEstimate,
  PricedLine,
  PricingMode,
  RateSettings,
} from "../providers/types.js";

const DEFAULT_RATES: RateSettings = {
  bodyRatePerHour: 75,
  paintRatePerHour: 85,
  mechanicalRatePerHour: 95,
  frameRatePerHour: 110,
  paintMaterialPerRefinishHour: 45,
  triCoatMultiplier: 1.35,
  blendMultiplier: 1.0,
  taxRate: 0.07,
  markupPercent: 0,
  currency: "USD",
};

export function defaultRateSettings(): RateSettings {
  return { ...DEFAULT_RATES };
}

export function priceEstimate(input: {
  lines: EstimateLineInput[];
  mode: PricingMode;
  rates: RateSettings;
  paintType?: "single_stage" | "two_stage" | "three_stage";
  isSamplePricing: boolean;
  confidenceHint?: number;
}): PricedEstimate {
  const rates = input.rates;
  const tri =
    input.paintType === "three_stage" ? rates.triCoatMultiplier : 1;
  const blendMul = rates.blendMultiplier;

  const lines: PricedLine[] = input.lines.map((line) => {
    const { partsAmount, priceSource } = pickParts(line, input.mode);
    const bodyH = line.bodyHours ?? 0;
    const structH = line.structuralHours ?? 0;
    const mechH = line.mechanicalHours ?? 0;
    const refinishH = (line.refinishHours ?? 0) * tri;
    const blendH = (line.blendHours ?? 0) * blendMul;

    const laborAmount =
      bodyH * rates.bodyRatePerHour +
      structH * rates.frameRatePerHour +
      mechH * rates.mechanicalRatePerHour +
      refinishH * rates.paintRatePerHour +
      blendH * rates.paintRatePerHour;

    const materialAmount = (refinishH + blendH) * rates.paintMaterialPerRefinishHour;
    const refinishAmount = refinishH * rates.paintRatePerHour + blendH * rates.paintRatePerHour;
    const sublet = line.subletAmount ?? 0;
    const lineTotal = partsAmount + laborAmount + materialAmount + sublet;

    return {
      ...line,
      partsAmount,
      laborAmount,
      refinishAmount,
      materialAmount,
      lineTotal,
      priceSource,
    };
  });

  const partsSubtotal = sum(lines.map((l) => l.partsAmount));
  const laborSubtotal = sum(lines.map((l) => l.laborAmount));
  const refinishSubtotal = sum(lines.map((l) => l.refinishAmount));
  const materialSubtotal = sum(lines.map((l) => l.materialAmount));
  const subletSubtotal = sum(lines.map((l) => l.subletAmount ?? 0));
  const preMarkup = partsSubtotal + laborSubtotal + materialSubtotal + subletSubtotal;
  const markupAmount = preMarkup * (rates.markupPercent / 100);
  const taxable = preMarkup + markupAmount;
  const taxAmount = taxable * rates.taxRate;
  const mid = taxable + taxAmount;

  // Range never a single precise number — ±8% band around mid, widened if sample
  const spread = input.isSamplePricing ? 0.12 : 0.08;
  const rangeLow = round2(mid * (1 - spread));
  const rangeHigh = round2(mid * (1 + spread));
  const confidence = clamp(
    input.confidenceHint ?? (input.isSamplePricing ? 0.55 : 0.72),
    0.2,
    0.95,
  );

  return {
    mode: input.mode,
    isSamplePricing: input.isSamplePricing,
    lines,
    partsSubtotal: round2(partsSubtotal),
    laborSubtotal: round2(laborSubtotal),
    refinishSubtotal: round2(refinishSubtotal),
    materialSubtotal: round2(materialSubtotal),
    subletSubtotal: round2(subletSubtotal),
    markupAmount: round2(markupAmount),
    taxAmount: round2(taxAmount),
    rangeLow,
    rangeHigh,
    confidence,
    currency: rates.currency,
  };
}

function pickParts(
  line: EstimateLineInput,
  mode: PricingMode,
): { partsAmount: number; priceSource: PricedLine["priceSource"] } {
  const oem = line.oemPrice ?? null;
  const am = line.aftermarketPrice ?? null;
  const recycled = line.recycledPrice ?? null;

  if (mode === "OEM") {
    if (oem != null) return { partsAmount: oem, priceSource: "oem" };
    if (am != null) return { partsAmount: am, priceSource: "aftermarket" };
    return { partsAmount: recycled ?? 0, priceSource: recycled != null ? "recycled" : "none" };
  }
  if (mode === "AFTERMARKET") {
    if (am != null) return { partsAmount: am, priceSource: "aftermarket" };
    if (oem != null) return { partsAmount: oem, priceSource: "oem" };
    return { partsAmount: recycled ?? 0, priceSource: recycled != null ? "recycled" : "none" };
  }
  // MIXED: prefer aftermarket when CAPA, else OEM
  if (line.capaCertified && am != null) return { partsAmount: am, priceSource: "aftermarket" };
  if (oem != null) return { partsAmount: oem, priceSource: "oem" };
  if (am != null) return { partsAmount: am, priceSource: "aftermarket" };
  return { partsAmount: recycled ?? 0, priceSource: recycled != null ? "recycled" : "none" };
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
