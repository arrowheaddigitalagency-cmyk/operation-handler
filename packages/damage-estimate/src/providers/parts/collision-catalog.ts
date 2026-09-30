import type { PartsPriceProvider, PartPriceQuote } from "../types.js";

/**
 * Free collision body-parts price catalog (market-ish USD ranges).
 * Not CCC — labeled sample until shop calibrates; better coverage than tiny mock map.
 */
type CatalogRow = {
  match: RegExp;
  pn: string;
  oem: number;
  am: number;
  recycled: number;
};

const CATALOG: CatalogRow[] = [
  { match: /front bumper/i, pn: "COL-FBC", oem: 520, am: 240, recycled: 150 },
  { match: /rear bumper/i, pn: "COL-RBC", oem: 480, am: 220, recycled: 140 },
  { match: /bumper/i, pn: "COL-BMP", oem: 450, am: 200, recycled: 130 },
  { match: /fender/i, pn: "COL-FND", oem: 340, am: 155, recycled: 100 },
  { match: /hood/i, pn: "COL-HOOD", oem: 650, am: 290, recycled: 190 },
  { match: /door/i, pn: "COL-DOOR", oem: 720, am: 310, recycled: 210 },
  { match: /quarter/i, pn: "COL-QTR", oem: 580, am: 260, recycled: 170 },
  { match: /trunk|deck/i, pn: "COL-TRUNK", oem: 560, am: 250, recycled: 160 },
  { match: /headlamp|headlight/i, pn: "COL-HL", oem: 410, am: 175, recycled: 120 },
  { match: /taillamp|taillight/i, pn: "COL-TL", oem: 280, am: 120, recycled: 85 },
  { match: /mirror/i, pn: "COL-MIR", oem: 220, am: 95, recycled: 60 },
  { match: /grille|grill/i, pn: "COL-GRL", oem: 310, am: 140, recycled: 90 },
  { match: /windshield|glass/i, pn: "COL-WS", oem: 380, am: 220, recycled: 0 },
  { match: /roof/i, pn: "COL-ROOF", oem: 900, am: 400, recycled: 250 },
  { match: /tire|wheel/i, pn: "COL-TIRE", oem: 180, am: 120, recycled: 50 },
  { match: /lamp/i, pn: "COL-LAMP", oem: 300, am: 130, recycled: 90 },
  { match: /panel|body/i, pn: "COL-PANEL", oem: 400, am: 180, recycled: 110 },
];

export class CollisionCatalogPartsProvider implements PartsPriceProvider {
  readonly name = "collision_catalog";

  async quote(input: {
    vin: string;
    partName: string;
    year?: string | null;
    make?: string | null;
    model?: string | null;
  }): Promise<PartPriceQuote> {
    const hit = CATALOG.find((r) => r.match.test(input.partName)) ?? {
      match: /.*/,
      pn: "COL-GEN",
      oem: 350,
      am: 160,
      recycled: 100,
    };

    // Mild year/make adjustment so quotes aren't flat for every car
    const year = Number(input.year) || 2018;
    const ageMul = year >= 2022 ? 1.12 : year >= 2018 ? 1.0 : year >= 2012 ? 0.9 : 0.8;
    const luxury =
      /bmw|mercedes|audi|lexus|porsche|cadillac|lincoln/i.test(input.make ?? "") ? 1.25 : 1;

    const mul = ageMul * luxury;
    return {
      partNumber: `${hit.pn}-${Math.abs(hash(input.partName + (input.vin || ""))) % 9000 + 1000}`,
      description: input.partName,
      oemPrice: round2(hit.oem * mul),
      aftermarketPrice: round2(hit.am * mul),
      capaCertified: true,
      recycledPrice: hit.recycled > 0 ? round2(hit.recycled * mul) : null,
      currency: "USD",
      isSample: true,
      provider: this.name,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
