import type { PartsPriceProvider, PartPriceQuote } from "../types.js";

/** MOCK part prices — clearly sample. */
export class MockPartsPriceProvider implements PartsPriceProvider {
  readonly name = "mock";

  async quote(input: {
    vin: string;
    partName: string;
    year?: string | null;
    make?: string | null;
    model?: string | null;
  }): Promise<PartPriceQuote> {
    const key = input.partName.toLowerCase();
    const catalog: Record<string, { pn: string; oem: number; am: number; recycled: number }> = {
      "front bumper cover": { pn: "OEM-FBC-001", oem: 485, am: 219, recycled: 140 },
      "left front fender": { pn: "OEM-LFF-014", oem: 320, am: 145, recycled: 95 },
      hood: { pn: "OEM-HOOD-02", oem: 610, am: 275, recycled: 180 },
      "left headlamp": { pn: "OEM-LHL-77", oem: 390, am: 165, recycled: 110 },
    };
    const hit =
      Object.entries(catalog).find(([k]) => key.includes(k) || k.includes(key))?.[1] ?? {
        pn: `SAMPLE-${Math.abs(hash(key)) % 9000 + 1000}`,
        oem: 250,
        am: 120,
        recycled: 80,
      };

    return {
      partNumber: hit.pn,
      description: input.partName,
      oemPrice: hit.oem,
      aftermarketPrice: hit.am,
      capaCertified: true,
      recycledPrice: hit.recycled,
      currency: "USD",
      isSample: true,
      provider: this.name,
    };
  }
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
