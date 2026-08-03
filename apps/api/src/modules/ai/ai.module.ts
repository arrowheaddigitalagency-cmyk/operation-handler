import { Module, forwardRef } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { LeadsModule } from "../leads/leads.module";
import { RateLimitGuard } from "../../core/rate-limit.guard";

@Module({
  imports: [forwardRef(() => NotificationsModule), forwardRef(() => LeadsModule)],
  controllers: [AiController],
  providers: [AiService, RateLimitGuard],
  exports: [AiService],
})
export class AiModule {}
