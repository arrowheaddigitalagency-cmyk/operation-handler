import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { SupportService } from "./support.service";
import { Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";

@Controller("support")
@UseGuards(RolesGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  @Roles("CUSTOMER")
  create(@Body() body: unknown, @Req() req: { user: { sub: string; role: string } }) {
    const dto = z
      .object({
        subject: z.string().min(3),
        body: z.string().min(5),
        repairCaseId: z.string().optional(),
        vehicleId: z.string().optional(),
      })
      .parse(body);
    return this.support.create(req.user, dto);
  }

  @Get()
  @Roles("CUSTOMER", "OWNER", "ADMIN", "MANAGER", "RECEPTION")
  list(@Req() req: { user: { sub: string; role: string } }) {
    return this.support.listMine(req.user);
  }

  @Patch(":id")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  update(@Param("id") id: string, @Body() body: unknown) {
    const dto = z
      .object({
        status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
        staffReply: z.string().optional(),
        assignedStaffId: z.string().nullable().optional(),
      })
      .parse(body);
    return this.support.updateStaff(id, dto);
  }
}
