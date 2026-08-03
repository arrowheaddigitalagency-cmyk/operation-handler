import { Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { loadEnv } from "@cc/config";
import { NotificationsService } from "./notifications.service";
import { Public } from "../auth/public.decorator";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Public()
  @Post("process")
  process(@Headers("x-cron-secret") secret?: string) {
    const env = loadEnv();
    if (secret !== env.CRON_SECRET) throw new UnauthorizedException();
    return this.notifications.processOutbox();
  }
}
