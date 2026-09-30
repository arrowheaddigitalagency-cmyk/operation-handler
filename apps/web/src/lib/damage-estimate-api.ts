import { api } from "./api";

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
  provider: string;
};

export type DeLine = {
  id: string;
  partName: string;
  partNumber: string | null;
  operation: string;
  severity: string | null;
  damageType: string | null;
  side: string | null;
  confidence: number | null;
  bboxJson: { x: number; y: number; w: number; h: number } | null;
  imageIndex: number | null;
  oemPrice: number | null;
  aftermarketPrice: number | null;
  recycledPrice: number | null;
  capaCertified: boolean;
  bodyHours: number | null;
  refinishHours: number | null;
  blendHours: number | null;
  editedByStaff: boolean;
};

export type DeSession = {
  id: string;
  publicToken: string;
  status: string;
  vin: string | null;
  vehicleJson: DecodedVehicle | null;
  paintJson: { paintCode?: string; paintType?: string; notes?: string } | null;
  photosJson: { url: string; storageKey: string }[] | null;
  pricingMode: string;
  samplePricing: boolean;
  rangeLow: number | null;
  rangeHigh: number | null;
  confidence: number | null;
  lines: DeLine[];
  appointmentId?: string | null;
  versions?: {
    id: string;
    kind: string;
    label: string | null;
    payloadJson?: { notes?: string[]; provider?: string; detections?: unknown[] } | null;
  }[];
};

export function decodeVin(vin: string) {
  return api<DecodedVehicle>("/damage-estimate/vin/decode", { method: "POST", json: { vin } });
}

export function createSession() {
  return api<DeSession>("/damage-estimate/sessions", { method: "POST" });
}

export function getSession(id: string) {
  return api<DeSession>(`/damage-estimate/sessions/${id}`);
}

export function patchSession(id: string, body: Record<string, unknown>) {
  return api<DeSession>(`/damage-estimate/sessions/${id}`, { method: "PATCH", json: body });
}

export async function uploadPhotos(id: string, files: File[]) {
  const fd = new FormData();
  for (const f of files) fd.append("images", f);
  const res = await fetch(`/api/v1/damage-estimate/sessions/${id}/photos`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Upload failed");
  }
  return res.json() as Promise<DeSession>;
}

export function removePhoto(id: string, index: number) {
  return api<DeSession>(`/damage-estimate/sessions/${id}/photos/${index}`, { method: "DELETE" });
}

export function analyzeSession(id: string) {
  return api<DeSession>(`/damage-estimate/sessions/${id}/analyze`, { method: "POST", json: {} });
}

export function updateLine(sessionId: string, lineId: string, body: Record<string, unknown>) {
  return api<DeSession>(`/damage-estimate/sessions/${sessionId}/lines/${lineId}`, {
    method: "PATCH",
    json: body,
  });
}

export function priceSession(id: string, mode: "OEM" | "AFTERMARKET" | "MIXED") {
  return api<{ rangeLow: number; rangeHigh: number; confidence: number; isSamplePricing: boolean; session: DeSession }>(
    `/damage-estimate/sessions/${id}/price`,
    { method: "POST", json: { mode } },
  );
}

export function getSlots() {
  return api<{ iso: string; label: string }[]>("/damage-estimate/slots");
}

export function bookSession(
  id: string,
  body: { name: string; phone: string; email: string; preferredAt: string; slotLabel?: string; notes?: string },
) {
  return api<{ appointment: { id: string; trackingId?: string }; session: DeSession }>(
    `/damage-estimate/sessions/${id}/book`,
    { method: "POST", json: body },
  );
}
