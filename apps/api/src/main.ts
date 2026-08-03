import "reflect-metadata";
import { config as dotenv } from "dotenv";
import { resolve } from "path";

// Load env from monorepo root and packages/db (DATABASE_URL for SQLite)
dotenv({ path: resolve(__dirname, "../../../.env") });
dotenv({ path: resolve(process.cwd(), "../../.env") });
dotenv({ path: resolve(process.cwd(), ".env") });
dotenv({ path: resolve(__dirname, "../../../packages/db/.env") });
dotenv({ path: resolve(process.cwd(), "../../packages/db/.env") });

import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { loadEnv, corsOriginList } from "@cc/config";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { rawBody: false });
  // Required behind Cloudflare / Hostinger reverse proxies for correct client IP (rate limits)
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: corsOriginList(env),
    credentials: true,
  });
  app.setGlobalPrefix("api/v1");

  // HOST=127.0.0.1 for single-domain Hostinger launcher; default all interfaces
  const host = process.env.HOST || "0.0.0.0";
  await app.listen(env.PORT, host);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://${host}:${env.PORT}/api/v1`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
