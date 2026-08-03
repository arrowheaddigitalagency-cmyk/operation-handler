import { Body, Controller, Headers, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { loadEnv } from "@cc/config";
import { MaintenanceService } from "./maintenance.service";
import { Public, Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";

@Controller("maintenance")
@UseGuards(RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

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
  run(@Headers("x-cron-secret") secret?: string) {
    const env = loadEnv();
    if (secret !== env.CRON_SECRET) throw new UnauthorizedException();
    return this.maintenance.runDueReminders();
  }
}
