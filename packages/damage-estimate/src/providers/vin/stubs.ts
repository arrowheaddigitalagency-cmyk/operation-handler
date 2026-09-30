import type { DecodedVehicle, VinProvider } from "../types.js";

/** Stub — plug DataOne credentials later. */
export class DataOneVinProvider implements VinProvider {
  readonly name = "dataone";
  async decode(_vin: string): Promise<DecodedVehicle> {
    throw new Error("DataOne VinProvider not configured (TODO: set DATAONE_API_KEY)");
  }
}

/** Stub — plug J.D. Power ChromeData later. */
export class ChromeDataVinProvider implements VinProvider {
  readonly name = "chromedata";
  async decode(_vin: string): Promise<DecodedVehicle> {
    throw new Error("ChromeData VinProvider not configured (TODO: set CHROMEDATA_API_KEY)");
  }
}
