import type { LaborOperation, LaborTimeProvider, LaborTimeQuote, PaintType, Severity } from "../types.js";

/** MOCK labor times — sample hours by severity/operation. */
export class MockLaborTimeProvider implements LaborTimeProvider {
  readonly name = "mock";

  async quote(input: {
    partName: string;
    operation: LaborOperation;
    severity: Severity;
    paintType?: PaintType;
  }): Promise<LaborTimeQuote> {
    const sevMul = input.severity === "light" ? 0.7 : input.severity === "heavy" ? 1.4 : 1;
    const base: Record<LaborOperation, Omit<LaborTimeQuote, "partName" | "operation" | "isSample" | "provider">> = {
      repair: { bodyHours: 2.5 * sevMul, structuralHours: 0, mechanicalHours: 0, refinishHours: 1.5, blendHours: 0.5 },
      replace: { bodyHours: 1.2, structuralHours: 0, mechanicalHours: 0.3, refinishHours: 2.0, blendHours: 0.8 },
      refinish: { bodyHours: 0.4, structuralHours: 0, mechanicalHours: 0, refinishHours: 1.8 * sevMul, blendHours: 0.6 },
      blend: { bodyHours: 0.2, structuralHours: 0, mechanicalHours: 0, refinishHours: 0.5, blendHours: 1.2 },
      r_and_i: { bodyHours: 0.8, structuralHours: 0, mechanicalHours: 0.4, refinishHours: 0, blendHours: 0 },
    };
    const hours = { ...base[input.operation] };
    if (input.paintType === "three_stage") {
      hours.refinishHours *= 1.35;
    }
    return {
      partName: input.partName,
      operation: input.operation,
      ...hours,
      isSample: true,
      provider: this.name,
    };
  }
}
