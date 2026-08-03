import { Controller, Get, UseGuards } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";

@Controller("reports")
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("ops")
  @Roles("OWNER", "ADMIN", "MANAGER")
  ops() {
    return this.reports.opsSummary();
  }
}
