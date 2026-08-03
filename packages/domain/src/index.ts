export enum UserRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  TECHNICIAN = "TECHNICIAN",
  RECEPTION = "RECEPTION",
  CUSTOMER = "CUSTOMER",
}

export enum RepairStage {
  RECEIVED = "RECEIVED",
  INSPECTION_COMPLETED = "INSPECTION_COMPLETED",
  INSURANCE_APPROVAL = "INSURANCE_APPROVAL",
  PARTS_ORDERED = "PARTS_ORDERED",
  PARTS_RECEIVED = "PARTS_RECEIVED",
  BODY_REPAIR = "BODY_REPAIR",
  PAINTING = "PAINTING",
  DRYING_FINISHING = "DRYING_FINISHING",
  ASSEMBLY = "ASSEMBLY",
  QUALITY_INSPECTION = "QUALITY_INSPECTION",
  ROAD_TEST = "ROAD_TEST",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  DELIVERED = "DELIVERED",
}

/** Canonical ordered pipeline (insurance may be skipped). */
export const REPAIR_STAGE_ORDER: RepairStage[] = [
  RepairStage.RECEIVED,
  RepairStage.INSPECTION_COMPLETED,
  RepairStage.INSURANCE_APPROVAL,
  RepairStage.PARTS_ORDERED,
  RepairStage.PARTS_RECEIVED,
  RepairStage.BODY_REPAIR,
  RepairStage.PAINTING,
  RepairStage.DRYING_FINISHING,
  RepairStage.ASSEMBLY,
  RepairStage.QUALITY_INSPECTION,
  RepairStage.ROAD_TEST,
  RepairStage.READY_FOR_PICKUP,
  RepairStage.DELIVERED,
];

export const REPAIR_STAGE_LABELS: Record<RepairStage, string> = {
  [RepairStage.RECEIVED]: "Vehicle Received",
  [RepairStage.INSPECTION_COMPLETED]: "Inspection Completed",
  [RepairStage.INSURANCE_APPROVAL]: "Insurance Approval",
  [RepairStage.PARTS_ORDERED]: "Parts Ordered",
  [RepairStage.PARTS_RECEIVED]: "Parts Received",
  [RepairStage.BODY_REPAIR]: "Body Repair",
  [RepairStage.PAINTING]: "Painting",
  [RepairStage.DRYING_FINISHING]: "Drying & Finishing",
  [RepairStage.ASSEMBLY]: "Assembly",
  [RepairStage.QUALITY_INSPECTION]: "Quality Inspection",
  [RepairStage.ROAD_TEST]: "Road Test",
  [RepairStage.READY_FOR_PICKUP]: "Ready for Pickup",
  [RepairStage.DELIVERED]: "Delivered",
};

export function progressPercent(stage: RepairStage, insuranceApplicable: boolean): number {
  const path = getEffectiveStages(insuranceApplicable);
  const idx = path.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round((idx / (path.length - 1)) * 100);
}

export function getEffectiveStages(insuranceApplicable: boolean): RepairStage[] {
  if (insuranceApplicable) return [...REPAIR_STAGE_ORDER];
  return REPAIR_STAGE_ORDER.filter((s) => s !== RepairStage.INSURANCE_APPROVAL);
}

export function canTransition(
  from: RepairStage,
  to: RepairStage,
  insuranceApplicable: boolean,
): boolean {
  const path = getEffectiveStages(insuranceApplicable);
  const fromIdx = path.indexOf(from);
  const toIdx = path.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return false;
  // Allow forward one step, or staff jump forward/back within path (manager override handled at API)
  return toIdx !== fromIdx;
}

export function nextStage(
  current: RepairStage,
  insuranceApplicable: boolean,
): RepairStage | null {
  const path = getEffectiveStages(insuranceApplicable);
  const idx = path.indexOf(current);
  if (idx < 0 || idx >= path.length - 1) return null;
  return path[idx + 1]!;
}

export type DamageFinding = {
  part: string;
  severity: "minor" | "moderate" | "severe";
  description: string;
};

export type DamageAnalysisResult = {
  findings: DamageFinding[];
  complexity: "low" | "medium" | "high";
  durationDaysMin: number;
  durationDaysMax: number;
  costMin: number;
  costMax: number;
  currency: string;
  confidence: number;
  caveats: string[];
  summary: string;
};

export const AI_ESTIMATE_DISCLAIMER =
  "AI assessment is advisory only. Final estimate and timeline will be confirmed after physical inspection at Cars Compound.";

export const STAFF_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.TECHNICIAN,
  UserRole.RECEPTION,
];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function canFinalizeEstimate(role: UserRole): boolean {
  return role === UserRole.MANAGER || role === UserRole.ADMIN || role === UserRole.OWNER;
}

/** Tracking ID: CC- + 6 alphanumeric (excludes ambiguous chars). */
export function generateTrackingId(randomBytes: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += alphabet[Math.floor(randomBytes() * alphabet.length)]!;
  }
  return `CC-${body}`;
}

/** Public AI report ID: CC-RPT- + 6 alphanumeric. */
export function generateReportId(randomBytes: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += alphabet[Math.floor(randomBytes() * alphabet.length)]!;
  }
  return `CC-RPT-${body}`;
}

/** Normalize AI part labels to shop price-band keys. */
export function normalizePartKey(part: string): string {
  const p = part.toLowerCase();
  if (p.includes("bumper") && (p.includes("front") || p.includes("fwd"))) return "front_bumper";
  if (p.includes("bumper") && (p.includes("rear") || p.includes("back"))) return "rear_bumper";
  if (p.includes("bumper")) return "front_bumper";
  if (p.includes("headlight") || p.includes("head lamp")) return "headlight";
  if (p.includes("taillight") || p.includes("tail light") || p.includes("tail lamp")) return "taillight";
  if (p.includes("fender")) return "fender";
  if (p.includes("door")) return "door";
  if (p.includes("hood") || p.includes("bonnet")) return "hood";
  if (p.includes("windshield") || p.includes("windscreen")) return "windshield";
  if (p.includes("mirror")) return "side_mirror";
  if (p.includes("paint") || p.includes("scratch")) return "paint";
  if (p.includes("quarter") || p.includes("panel")) return "body_panel";
  return "general_body";
}

export type PriceBandInput = {
  partKey: string;
  severity: string;
  costMin: number;
  costMax: number;
  durationDaysMin: number;
  durationDaysMax: number;
  complexity: string;
  currency: string;
  partLabel?: string;
};

export type PricedLine = {
  part: string;
  partKey: string;
  severity: string;
  description: string;
  costMin: number;
  costMax: number;
  durationDaysMin: number;
  durationDaysMax: number;
  bandMatched: boolean;
};

export type PricedAnalysis = {
  lines: PricedLine[];
  costMin: number;
  costMax: number;
  durationDaysMin: number;
  durationDaysMax: number;
  complexity: "low" | "medium" | "high";
  currency: string;
  pricingSource: "shop_price_bands";
  summary: string;
  confidence: number;
  caveats: string[];
  findings: DamageFinding[];
};

const FALLBACK_BANDS: Record<string, Omit<PriceBandInput, "partKey" | "severity">> = {
  minor: { costMin: 250, costMax: 600, durationDaysMin: 1, durationDaysMax: 2, complexity: "low", currency: "USD" },
  moderate: { costMin: 600, costMax: 1500, durationDaysMin: 2, durationDaysMax: 4, complexity: "medium", currency: "USD" },
  severe: { costMin: 1500, costMax: 3500, durationDaysMin: 4, durationDaysMax: 8, complexity: "high", currency: "USD" },
};

export function applyShopPricing(
  findings: DamageFinding[],
  bands: PriceBandInput[],
  opts?: { currency?: string; confidence?: number; summary?: string },
): PricedAnalysis {
  const currency = opts?.currency ?? "USD";
  const lines: PricedLine[] = findings.map((f) => {
    const partKey = normalizePartKey(f.part);
    const band = bands.find((b) => b.partKey === partKey && b.severity === f.severity);
    const fallback = FALLBACK_BANDS[f.severity] ?? FALLBACK_BANDS.moderate!;
    const use = band
      ? {
          costMin: band.costMin,
          costMax: band.costMax,
          durationDaysMin: band.durationDaysMin,
          durationDaysMax: band.durationDaysMax,
        }
      : fallback;
    return {
      part: f.part,
      partKey,
      severity: f.severity,
      description: f.description,
      costMin: use.costMin,
      costMax: use.costMax,
      durationDaysMin: use.durationDaysMin,
      durationDaysMax: use.durationDaysMax,
      bandMatched: Boolean(band),
    };
  });

  const costMin = lines.reduce((s, l) => s + l.costMin, 0);
  const costMax = lines.reduce((s, l) => s + l.costMax, 0);
  const durationDaysMin = lines.length ? Math.max(...lines.map((l) => l.durationDaysMin)) : 1;
  const durationDaysMax = lines.length ? Math.max(...lines.map((l) => l.durationDaysMax)) : 3;
  const severities = findings.map((f) => f.severity);
  const complexity: "low" | "medium" | "high" = severities.includes("severe")
    ? "high"
    : severities.includes("moderate")
      ? "medium"
      : "low";

  return {
    lines,
    costMin,
    costMax,
    durationDaysMin,
    durationDaysMax,
    complexity,
    currency,
    pricingSource: "shop_price_bands",
    summary:
      opts?.summary ??
      "Damage findings priced using Cars Compound repair price bands. Final quote after inspection.",
    confidence: opts?.confidence ?? 0.7,
    caveats: [AI_ESTIMATE_DISCLAIMER],
    findings,
  };
}

export const DEFAULT_PRICE_BAND_SEED: Array<{
  partKey: string;
  partLabel: string;
  severity: string;
  costMin: number;
  costMax: number;
  durationDaysMin: number;
  durationDaysMax: number;
  complexity: string;
}> = [
  { partKey: "front_bumper", partLabel: "Front bumper", severity: "minor", costMin: 350, costMax: 750, durationDaysMin: 1, durationDaysMax: 3, complexity: "low" },
  { partKey: "front_bumper", partLabel: "Front bumper", severity: "moderate", costMin: 750, costMax: 1600, durationDaysMin: 3, durationDaysMax: 5, complexity: "medium" },
  { partKey: "front_bumper", partLabel: "Front bumper", severity: "severe", costMin: 1600, costMax: 3200, durationDaysMin: 4, durationDaysMax: 7, complexity: "high" },
  { partKey: "rear_bumper", partLabel: "Rear bumper", severity: "minor", costMin: 350, costMax: 750, durationDaysMin: 1, durationDaysMax: 3, complexity: "low" },
  { partKey: "rear_bumper", partLabel: "Rear bumper", severity: "moderate", costMin: 750, costMax: 1600, durationDaysMin: 3, durationDaysMax: 5, complexity: "medium" },
  { partKey: "rear_bumper", partLabel: "Rear bumper", severity: "severe", costMin: 1600, costMax: 3000, durationDaysMin: 4, durationDaysMax: 7, complexity: "high" },
  { partKey: "headlight", partLabel: "Headlight", severity: "minor", costMin: 200, costMax: 450, durationDaysMin: 1, durationDaysMax: 2, complexity: "low" },
  { partKey: "headlight", partLabel: "Headlight", severity: "moderate", costMin: 450, costMax: 900, durationDaysMin: 1, durationDaysMax: 3, complexity: "medium" },
  { partKey: "headlight", partLabel: "Headlight", severity: "severe", costMin: 900, costMax: 1800, durationDaysMin: 2, durationDaysMax: 4, complexity: "high" },
  { partKey: "hood", partLabel: "Hood", severity: "minor", costMin: 300, costMax: 700, durationDaysMin: 1, durationDaysMax: 3, complexity: "low" },
  { partKey: "hood", partLabel: "Hood", severity: "moderate", costMin: 700, costMax: 1400, durationDaysMin: 2, durationDaysMax: 4, complexity: "medium" },
  { partKey: "hood", partLabel: "Hood", severity: "severe", costMin: 1400, costMax: 2800, durationDaysMin: 3, durationDaysMax: 6, complexity: "high" },
  { partKey: "fender", partLabel: "Fender", severity: "minor", costMin: 300, costMax: 650, durationDaysMin: 1, durationDaysMax: 3, complexity: "low" },
  { partKey: "fender", partLabel: "Fender", severity: "moderate", costMin: 650, costMax: 1300, durationDaysMin: 2, durationDaysMax: 4, complexity: "medium" },
  { partKey: "fender", partLabel: "Fender", severity: "severe", costMin: 1300, costMax: 2500, durationDaysMin: 3, durationDaysMax: 6, complexity: "high" },
  { partKey: "door", partLabel: "Door", severity: "minor", costMin: 350, costMax: 800, durationDaysMin: 1, durationDaysMax: 3, complexity: "low" },
  { partKey: "door", partLabel: "Door", severity: "moderate", costMin: 800, costMax: 1700, durationDaysMin: 3, durationDaysMax: 5, complexity: "medium" },
  { partKey: "door", partLabel: "Door", severity: "severe", costMin: 1700, costMax: 3500, durationDaysMin: 4, durationDaysMax: 8, complexity: "high" },
  { partKey: "paint", partLabel: "Paint / scratch", severity: "minor", costMin: 200, costMax: 500, durationDaysMin: 1, durationDaysMax: 2, complexity: "low" },
  { partKey: "paint", partLabel: "Paint / scratch", severity: "moderate", costMin: 500, costMax: 1200, durationDaysMin: 2, durationDaysMax: 4, complexity: "medium" },
  { partKey: "paint", partLabel: "Paint / scratch", severity: "severe", costMin: 1200, costMax: 2500, durationDaysMin: 3, durationDaysMax: 6, complexity: "high" },
  { partKey: "general_body", partLabel: "General body", severity: "minor", costMin: 300, costMax: 700, durationDaysMin: 1, durationDaysMax: 3, complexity: "low" },
  { partKey: "general_body", partLabel: "General body", severity: "moderate", costMin: 700, costMax: 1600, durationDaysMin: 3, durationDaysMax: 5, complexity: "medium" },
  { partKey: "general_body", partLabel: "General body", severity: "severe", costMin: 1600, costMax: 3500, durationDaysMin: 4, durationDaysMax: 8, complexity: "high" },
];

export type MaintenanceInterval =
  | { type: "months"; value: number }
  | { type: "kilometers"; value: number }
  | { type: "years"; value: number };

export const DEFAULT_MAINTENANCE_RULES: Array<{
  code: string;
  name: string;
  interval: MaintenanceInterval;
}> = [
  { code: "OIL_CHANGE", name: "Oil Change", interval: { type: "months", value: 6 } },
  { code: "BRAKE_INSPECTION", name: "Brake Inspection", interval: { type: "months", value: 6 } },
  { code: "WHEEL_ALIGNMENT", name: "Wheel Alignment", interval: { type: "kilometers", value: 10000 } },
  { code: "BATTERY", name: "Battery", interval: { type: "years", value: 2 } },
  { code: "AIR_FILTER", name: "Air Filter", interval: { type: "months", value: 12 } },
  { code: "COOLANT", name: "Coolant", interval: { type: "months", value: 24 } },
  { code: "TRANSMISSION", name: "Transmission Service", interval: { type: "months", value: 24 } },
];

export const FOLLOW_UP_OFFSETS_DAYS = [0, 3, 7, 30, 180, 365] as const;
