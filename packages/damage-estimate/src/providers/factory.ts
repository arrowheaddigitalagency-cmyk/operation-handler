import type {
  DamageProvider,
  LaborTimeProvider,
  PaintProvider,
  PartsPriceProvider,
  VinProvider,
} from "./types.js";
import { NhtsaVpicVinProvider } from "./vin/nhtsa-vpic.js";
import { ChromeDataVinProvider, DataOneVinProvider } from "./vin/stubs.js";
import { MockDamageProvider } from "./damage/mock.js";
import { GeminiDamageProvider } from "./damage/gemini.js";
import { GroqDamageProvider } from "./damage/groq.js";
import { EnsembleDamageProvider } from "./damage/ensemble.js";
import {
  TractableDamageProvider,
  VisionLlmDamageProvider,
  YoloDamageProvider,
} from "./damage/stubs.js";
import { MockPartsPriceProvider } from "./parts/mock.js";
import { CollisionCatalogPartsProvider } from "./parts/collision-catalog.js";
import {
  LkqKeystoneProvider,
  OeConnectionProvider,
  Partslink24Provider,
  PartsTechProvider,
} from "./parts/stubs.js";
import { MockLaborTimeProvider } from "./labor/mock.js";
import { OpenLaborTimeProvider } from "./labor/open-labor.js";
import { MotorLaborTimeProvider } from "./labor/stubs.js";
import { MockPaintProvider } from "./paint/mock.js";

export type ProviderBundle = {
  vin: VinProvider;
  damage: DamageProvider;
  parts: PartsPriceProvider;
  labor: LaborTimeProvider;
  paint: PaintProvider;
};

export type ProviderEnv = {
  NHTSA_VPIC_BASE_URL?: string;
  VIN_PROVIDER?: string;
  DAMAGE_PROVIDER?: string;
  PARTS_PROVIDER?: string;
  LABOR_PROVIDER?: string;
  PAINT_PROVIDER?: string;
  OPEN_LABOR_API_KEY?: string;
  OPEN_LABOR_BASE_URL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_VISION_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_VISION_MODEL?: string;
};

export function createProviders(env: ProviderEnv = {}): ProviderBundle {
  return {
    vin: createVin(env),
    damage: createDamage(env),
    parts: createParts(env),
    labor: createLabor(env),
    paint: createPaint(env),
  };
}

function createVin(env: ProviderEnv): VinProvider {
  const kind = (env.VIN_PROVIDER ?? "nhtsa").toLowerCase();
  if (kind === "dataone") return new DataOneVinProvider();
  if (kind === "chromedata") return new ChromeDataVinProvider();
  return new NhtsaVpicVinProvider(env.NHTSA_VPIC_BASE_URL);
}

function createDamage(env: ProviderEnv): DamageProvider {
  const kind = (env.DAMAGE_PROVIDER ?? "mock").toLowerCase();
  if (kind === "yolo") return new YoloDamageProvider();
  if (kind === "vision_llm") return new VisionLlmDamageProvider();
  if (kind === "tractable") return new TractableDamageProvider();
  if (kind === "ensemble" || kind === "dual" || kind === "gemini_groq") {
    return new EnsembleDamageProvider({
      geminiApiKey: env.GEMINI_API_KEY,
      geminiModel: env.GEMINI_VISION_MODEL,
      groqApiKey: env.GROQ_API_KEY,
      groqModel: env.GROQ_VISION_MODEL,
    });
  }
  if (kind === "groq") {
    return new GroqDamageProvider(env.GROQ_API_KEY ?? "", env.GROQ_VISION_MODEL);
  }
  if (kind === "gemini") {
    return new GeminiDamageProvider(env.GEMINI_API_KEY ?? "", env.GEMINI_VISION_MODEL);
  }
  return new MockDamageProvider();
}

function createParts(env: ProviderEnv): PartsPriceProvider {
  const kind = (env.PARTS_PROVIDER ?? "collision_catalog").toLowerCase();
  if (kind === "partstech") return new PartsTechProvider();
  if (kind === "oeconnection") return new OeConnectionProvider();
  if (kind === "partslink24") return new Partslink24Provider();
  if (kind === "lkq") return new LkqKeystoneProvider();
  if (kind === "mock") return new MockPartsPriceProvider();
  return new CollisionCatalogPartsProvider();
}

function createLabor(env: ProviderEnv): LaborTimeProvider {
  const kind = (env.LABOR_PROVIDER ?? "mock").toLowerCase();
  if (kind === "motor") return new MotorLaborTimeProvider();
  if (kind === "openlabor" || kind === "open_labor") {
    return new OpenLaborTimeProvider(
      env.OPEN_LABOR_API_KEY ?? "",
      env.OPEN_LABOR_BASE_URL ?? "https://openlaborproject.com",
    );
  }
  return new MockLaborTimeProvider();
}

function createPaint(env: ProviderEnv): PaintProvider {
  const kind = (env.PAINT_PROVIDER ?? "mock").toLowerCase();
  void kind;
  return new MockPaintProvider();
}
