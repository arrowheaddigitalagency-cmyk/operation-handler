import { z } from "zod";

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined) return fallback;
      return ["1", "true", "yes", "on"].includes(v.toLowerCase());
    });

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("Cars Compound"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),
  APP_TIMEZONE: z.string().default("America/New_York"),
  CURRENCY: z.string().default("USD"),
  MEDIA_RETENTION_MONTHS: z.coerce.number().int().positive().default(24),
  GOOGLE_REVIEW_URL: z.string().optional(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_SECURE: bool(false),

  DATABASE_URL: z.string().min(1),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("cars-compound"),
  STORAGE_LOCAL_FALLBACK: bool(true),

  AI_PROVIDER: z.enum(["mock", "openai", "gemini"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_VISION_MODEL: z.string().default("gpt-4o-mini"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_VISION_MODEL: z.string().default("gemini-2.0-flash"),
  AI_MAX_IMAGES: z.coerce.number().int().positive().default(8),
  AI_MAX_IMAGE_MB: z.coerce.number().positive().default(8),

  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("noreply@carscompound.local"),

  SMS_PROVIDER: z.enum(["console", "twilio"]).default("console"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  CRON_SECRET: z.string().min(8),
  ENABLE_WORKER: bool(true),
  SENTRY_DSN: z.string().optional(),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(4000),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${details}`);
  }
  const data = parsed.data;
  // Always force secure cookies in production unless explicitly overridden later via HTTPS termination docs
  if (data.NODE_ENV === "production" && source.COOKIE_SECURE === undefined) {
    return { ...data, COOKIE_SECURE: true };
  }
  if (data.NODE_ENV === "production" && !data.COOKIE_SECURE) {
    // eslint-disable-next-line no-console
    console.warn("[config] COOKIE_SECURE=false in production — set COOKIE_SECURE=true behind HTTPS");
  }
  return data;
}

export function corsOriginList(env: AppEnv): string[] {
  return env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
}
