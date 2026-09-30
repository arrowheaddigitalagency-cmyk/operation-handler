export type PaintType = "single_stage" | "two_stage" | "three_stage";

export type DamageType =
  | "dent"
  | "scratch"
  | "crack"
  | "tear"
  | "paint_damage"
  | "glass";

export type Severity = "light" | "medium" | "heavy";

export type LaborOperation =
  | "repair"
  | "replace"
  | "refinish"
  | "blend"
  | "r_and_i";

export type BoundingBox = {
  /** Normalized 0–1 relative to image width/height */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DecodedVehicle = {
  vin: string;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  engine: string | null;
  driveType: string | null;
  plantCountry: string | null;
  raw?: Record<string, string | null>;
  provider: string;
};

export type DamageDetection = {
  id: string;
  partName: string;
  side: "left" | "right" | "center" | "front" | "rear" | "unknown";
  position?: string;
  damageType: DamageType;
  severity: Severity;
  operation: LaborOperation;
  confidence: number;
  imageIndex: number;
  bbox?: BoundingBox;
  maskSvg?: string;
};

export type DamageAnalyzeInput = {
  imageUrls: string[];
  vehicle?: Partial<DecodedVehicle>;
  paintType?: PaintType;
  paintCode?: string;
};

export type DamageAnalyzeResult = {
  provider: string;
  isSample: true | false;
  detections: DamageDetection[];
  notes?: string[];
  analyzedAt: string;
};

export type PartPriceQuote = {
  partNumber: string;
  description: string;
  oemPrice: number | null;
  aftermarketPrice: number | null;
  capaCertified: boolean;
  recycledPrice: number | null;
  currency: string;
  isSample: boolean;
  provider: string;
};

export type LaborTimeQuote = {
  partName: string;
  operation: LaborOperation;
  bodyHours: number;
  structuralHours: number;
  mechanicalHours: number;
  refinishHours: number;
  blendHours: number;
  isSample: boolean;
  provider: string;
};

export type RateSettings = {
  bodyRatePerHour: number;
  paintRatePerHour: number;
  mechanicalRatePerHour: number;
  frameRatePerHour: number;
  paintMaterialPerRefinishHour: number;
  triCoatMultiplier: number;
  blendMultiplier: number;
  taxRate: number;
  markupPercent: number;
  currency: string;
};

export type PricingMode = "OEM" | "AFTERMARKET" | "MIXED";

export type EstimateLineInput = {
  id: string;
  partName: string;
  partNumber?: string;
  description?: string;
  operation: LaborOperation;
  severity: Severity;
  side?: string;
  oemPrice?: number | null;
  aftermarketPrice?: number | null;
  recycledPrice?: number | null;
  capaCertified?: boolean;
  bodyHours?: number;
  structuralHours?: number;
  mechanicalHours?: number;
  refinishHours?: number;
  blendHours?: number;
  subletAmount?: number;
};

export type PricedLine = EstimateLineInput & {
  partsAmount: number;
  laborAmount: number;
  refinishAmount: number;
  materialAmount: number;
  lineTotal: number;
  priceSource: "oem" | "aftermarket" | "recycled" | "none";
};

export type PricedEstimate = {
  mode: PricingMode;
  isSamplePricing: boolean;
  lines: PricedLine[];
  partsSubtotal: number;
  laborSubtotal: number;
  refinishSubtotal: number;
  materialSubtotal: number;
  subletSubtotal: number;
  markupAmount: number;
  taxAmount: number;
  rangeLow: number;
  rangeHigh: number;
  confidence: number;
  currency: string;
};

export interface VinProvider {
  readonly name: string;
  decode(vin: string): Promise<DecodedVehicle>;
}

export interface DamageProvider {
  readonly name: string;
  analyze(input: DamageAnalyzeInput): Promise<DamageAnalyzeResult>;
}

export interface PartsPriceProvider {
  readonly name: string;
  quote(input: {
    vin: string;
    partName: string;
    year?: string | null;
    make?: string | null;
    model?: string | null;
  }): Promise<PartPriceQuote>;
}

export interface LaborTimeProvider {
  readonly name: string;
  quote(input: {
    partName: string;
    operation: LaborOperation;
    severity: Severity;
    paintType?: PaintType;
    year?: string | null;
    make?: string | null;
    model?: string | null;
    vin?: string | null;
  }): Promise<LaborTimeQuote>;
}

export interface PaintProvider {
  readonly name: string;
  resolve(input: {
    paintCode?: string;
    make?: string | null;
    year?: string | null;
  }): Promise<{ paintCode: string | null; paintType: PaintType; notes?: string; isSample: boolean }>;
}
