import { Controller, Headers, Post } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { Public } from "../auth/public.decorator";
import { PrismaService } from "../../core/core.providers";
import {
  assertCronSecret,
  releaseJobLock,
  tryAcquireJobLock,
} from "../../core/cron-auth";

@Controller("campaigns")
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post("run")
  async run(@Headers("x-cron-secret") secret?: string) {
    assertCronSecret(secret);
    const lockKey = "cron:campaigns-run";
    if (!(await tryAcquireJobLock(this.prisma, lockKey, 25 * 60_000))) {
      return { skipped: true, reason: "lock_held" };
    }
    try {
      return await this.campaigns.runDueSteps();
    } finally {
      await releaseJobLock(this.prisma, lockKey);
    }
  }
}
