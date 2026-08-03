import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { LeadsService } from "./leads.service";
import { Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";

@Controller("leads")
@UseGuards(RolesGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  list(@Query("status") status?: string, @Query("page") page?: string) {
    return this.leads.list(status, page ? Number(page) : 1);
  }

  @Patch(":id")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  update(@Param("id") id: string, @Body() body: unknown) {
    const dto = z
      .object({
        status: z.enum(["NEW", "CONTACTED", "INSPECTION_SCHEDULED", "CONVERTED", "LOST"]).optional(),
        notes: z.string().optional(),
        assignedStaffId: z.string().nullable().optional(),
        appointmentId: z.string().optional(),
        repairCaseId: z.string().optional(),
      })
      .parse(body);
    return this.leads.update(id, dto);
  }
}
