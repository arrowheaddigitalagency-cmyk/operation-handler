import "reflect-metadata";
import { config as dotenv } from "dotenv";
import { resolve } from "path";
import cron from "node-cron";

dotenv({ path: resolve(__dirname, "../../../.env") });
dotenv({ path: resolve(process.cwd(), ".env") });

import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { loadEnv } from "@cc/config";
import { NotificationsService } from "./modules/notifications/notifications.service";
import { MaintenanceService } from "./modules/maintenance/maintenance.service";
import { CampaignsService } from "./modules/campaigns/campaigns.service";

async function bootstrap() {
  const env = loadEnv();
  const logger = new Logger("Worker");
  if (!env.ENABLE_WORKER) {
    logger.log("Worker disabled via ENABLE_WORKER=false");
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: env.NODE_ENV === "production" ? ["error", "warn", "log"] : ["error", "warn", "log", "debug"],
  });

  const notifications = app.get(NotificationsService);
  const maintenance = app.get(MaintenanceService);
  const campaigns = app.get(CampaignsService);

  logger.log("Cars Compound worker started");

  cron.schedule("* * * * *", async () => {
    try {
      const result = await notifications.processOutbox();
      if (result.processed) logger.log(`outbox processed=${result.processed}`);
    } catch (err) {
      logger.error("outbox failed", err instanceof Error ? err.stack : String(err));
    }
  });

  cron.schedule("15 * * * *", async () => {
    try {
      const result = await maintenance.runDueReminders();
      logger.log(`maintenance ${JSON.stringify(result)}`);
    } catch (err) {
      logger.error("maintenance failed", err instanceof Error ? err.stack : String(err));
    }
  });

  cron.schedule("*/30 * * * *", async () => {
    try {
      const result = await campaigns.runDueSteps();
      logger.log(`campaigns ${JSON.stringify(result)}`);
    } catch (err) {
      logger.error("campaigns failed", err instanceof Error ? err.stack : String(err));
    }
  });
}

bootstrap().catch((err) => {
  // Fatal bootstrap — keep stderr for PM2
  console.error(err);
  process.exit(1);
});
