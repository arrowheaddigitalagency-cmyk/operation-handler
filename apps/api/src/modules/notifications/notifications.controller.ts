import { Controller, Headers, Post } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { Public } from "../auth/public.decorator";
import { PrismaService } from "../../core/core.providers";
import {
  assertCronSecret,
  releaseJobLock,
  tryAcquireJobLock,
} from "../../core/cron-auth";

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post("process")
  async process(@Headers("x-cron-secret") secret?: string) {
    assertCronSecret(secret);
    const lockKey = "cron:notifications-process";
    if (!(await tryAcquireJobLock(this.prisma, lockKey, 55_000))) {
      return { skipped: true, reason: "lock_held" };
    }
    try {
      return await this.notifications.processOutbox();
    } finally {
      await releaseJobLock(this.prisma, lockKey);
    }
  }
}
