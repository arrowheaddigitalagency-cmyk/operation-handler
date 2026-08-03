import { Module, forwardRef } from "@nestjs/common";
import { RepairsController } from "./repairs.controller";
import { RepairsService } from "./repairs.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { LeadsModule } from "../leads/leads.module";
import { RateLimitGuard } from "../../core/rate-limit.guard";

@Module({
  imports: [
    forwardRef(() => NotificationsModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => LeadsModule),
  ],
  controllers: [RepairsController],
  providers: [RepairsService, RateLimitGuard],
  exports: [RepairsService],
})
export class RepairsModule {}
