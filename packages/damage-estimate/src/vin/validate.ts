/** ISO 3779 VIN: 17 chars, no I/O/Q, with North American check digit (pos 9). */

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export type VinValidationResult =
  | { ok: true; vin: string }
  | { ok: false; error: string };

export function normalizeVin(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function validateVin(raw: string): VinValidationResult {
  const vin = normalizeVin(raw);
  if (vin.length !== 17) {
    return { ok: false, error: "VIN must be exactly 17 characters" };
  }
  if (!VIN_RE.test(vin)) {
    return { ok: false, error: "VIN may not contain I, O, or Q" };
  }
  if (!checkDigitOk(vin)) {
    return { ok: false, error: "VIN check digit is invalid" };
  }
  return { ok: true, vin };
}

function checkDigitOk(vin: string): boolean {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i]!;
    const val = TRANSLITERATION[ch];
    if (val === undefined) return false;
    sum += val * WEIGHTS[i]!;
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);
  return vin[8] === expected;
}
