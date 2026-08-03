import { Module, forwardRef } from "@nestjs/common";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { LeadsModule } from "../leads/leads.module";
import { RateLimitGuard } from "../../core/rate-limit.guard";

@Module({
  imports: [forwardRef(() => NotificationsModule), forwardRef(() => LeadsModule)],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, RateLimitGuard],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
