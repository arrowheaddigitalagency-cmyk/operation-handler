import type { PartsPriceProvider, PartPriceQuote } from "../types.js";

type QuoteIn = {
  vin: string;
  partName: string;
  year?: string | null;
  make?: string | null;
  model?: string | null;
};

async function notConfigured(name: string, env: string): Promise<PartPriceQuote> {
  throw new Error(`${name} PartsPriceProvider not configured (TODO: set ${env})`);
}

export class PartsTechProvider implements PartsPriceProvider {
  readonly name = "partstech";
  quote(input: QuoteIn) {
    return notConfigured("PartsTech", "PARTSTECH_API_KEY");
  }
}

export class OeConnectionProvider implements PartsPriceProvider {
  readonly name = "oeconnection";
  quote(input: QuoteIn) {
    return notConfigured("OEConnection", "OECONNECTION_API_KEY");
  }
}

export class Partslink24Provider implements PartsPriceProvider {
  readonly name = "partslink24";
  quote(input: QuoteIn) {
    return notConfigured("Partslink24", "PARTSLINK24_API_KEY");
  }
}

export class LkqKeystoneProvider implements PartsPriceProvider {
  readonly name = "lkq_keystone";
  quote(input: QuoteIn) {
    return notConfigured("LKQ/Keystone", "LKQ_API_KEY");
  }
}
