import type { DecodedVehicle, VinProvider } from "../types.js";
import { validateVin } from "../../vin/validate.js";

const DEFAULT_BASE = "https://vpic.nhtsa.dot.gov/api";

type VpicResult = {
  Results?: Array<Record<string, string | null | undefined>>;
};

function pick(row: Record<string, string | null | undefined>, key: string): string | null {
  const v = row[key];
  if (v == null || v === "" || v === "Not Applicable") return null;
  return String(v);
}

export class NhtsaVpicVinProvider implements VinProvider {
  readonly name = "nhtsa_vpic";

  constructor(private readonly baseUrl: string = DEFAULT_BASE) {}

  async decode(rawVin: string): Promise<DecodedVehicle> {
    const check = validateVin(rawVin);
    if (!check.ok) throw new Error(check.error);
    const vin = check.vin;

    const url = `${this.baseUrl.replace(/\/$/, "")}/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`NHTSA vPIC request failed (${res.status})`);
    }
    const data = (await res.json()) as VpicResult;
    const row = data.Results?.[0];
    if (!row) throw new Error("NHTSA returned no decode results");

    const errorCode = pick(row, "ErrorCode");
    if (errorCode && errorCode !== "0" && !errorCode.startsWith("0,")) {
      const msg = pick(row, "ErrorText") ?? `NHTSA error code ${errorCode}`;
      // Some VINs still return partial data with soft errors — only hard-fail when empty make/model
      if (!pick(row, "Make") && !pick(row, "Model")) {
        throw new Error(msg);
      }
    }

    const cylinders = pick(row, "EngineCylinders");
    const displacement = pick(row, "DisplacementL");
    const engine =
      [displacement ? `${displacement}L` : null, cylinders ? `${cylinders} cyl` : null]
        .filter(Boolean)
        .join(" ") || pick(row, "EngineConfiguration");

    return {
      vin,
      year: pick(row, "ModelYear"),
      make: pick(row, "Make"),
      model: pick(row, "Model"),
      trim: pick(row, "Trim") ?? pick(row, "Series"),
      bodyClass: pick(row, "BodyClass"),
      engine,
      driveType: pick(row, "DriveType"),
      plantCountry: pick(row, "PlantCountry"),
      provider: this.name,
      raw: Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, v == null ? null : String(v)]),
      ),
    };
  }
}
