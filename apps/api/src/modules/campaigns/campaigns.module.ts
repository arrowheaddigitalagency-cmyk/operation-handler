import { Module, forwardRef } from "@nestjs/common";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
