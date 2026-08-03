import { Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { MaintenanceService } from "./maintenance.service";
import { Public, Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../../core/core.providers";
import {
  assertCronSecret,
  releaseJobLock,
  tryAcquireJobLock,
} from "../../core/cron-auth";

@Controller("maintenance")
@UseGuards(RolesGuard)
export class MaintenanceController {
  constructor(
    private readonly maintenance: MaintenanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("schedule")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  schedule(@Body() body: unknown) {
    const dto = z
      .object({
        vehicleId: z.string(),
        ruleCode: z.string(),
        lastServiceAt: z.string().datetime().optional(),
        currentMileage: z.number().int().optional(),
      })
      .parse(body);
    return this.maintenance.schedule(dto);
  }

  @Public()
  @Post("run-reminders")
  async run(@Headers("x-cron-secret") secret?: string) {
    assertCronSecret(secret);
    const lockKey = "cron:maintenance-reminders";
    if (!(await tryAcquireJobLock(this.prisma, lockKey, 50 * 60_000))) {
      return { skipped: true, reason: "lock_held" };
    }
    try {
      return await this.maintenance.runDueReminders();
    } finally {
      await releaseJobLock(this.prisma, lockKey);
    }
  }
}
