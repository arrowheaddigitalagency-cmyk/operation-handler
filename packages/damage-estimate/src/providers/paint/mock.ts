import type { PaintProvider, PaintType } from "../types.js";

/** MOCK paint code → type heuristic. */
export class MockPaintProvider implements PaintProvider {
  readonly name = "mock";

  async resolve(input: {
    paintCode?: string;
    make?: string | null;
    year?: string | null;
  }): Promise<{ paintCode: string | null; paintType: PaintType; notes?: string; isSample: boolean }> {
    const code = input.paintCode?.trim().toUpperCase() || null;
    let paintType: PaintType = "two_stage";
    const notes = "SAMPLE — paint type inferred without OEM paint database";
    if (code) {
      if (/PEARL|TRI|3S|MICA/i.test(code)) paintType = "three_stage";
      else if (/SINGLE|1S|SS/i.test(code)) paintType = "single_stage";
      else paintType = "two_stage";
    }
    return { paintCode: code, paintType, notes, isSample: true };
  }
}
