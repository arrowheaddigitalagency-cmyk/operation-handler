import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AppointmentsService } from "./appointments.service";
import { Public, Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { RateLimit, RateLimitGuard } from "../../core/rate-limit.guard";

@Controller("appointments")
@UseGuards(RolesGuard, RateLimitGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Public()
  @RateLimit(15, 60_000)
  @Post("book")
  book(@Body() body: unknown) {
    const dto = z
      .object({
        scheduledAt: z.string().datetime(),
        contactName: z.string().min(1),
        contactEmail: z.string().email(),
        contactPhone: z.string().min(7),
        notes: z.string().optional(),
        damageAnalysisId: z.string().optional(),
        make: z.string().optional(),
        model: z.string().optional(),
        year: z.number().int().optional(),
      })
      .parse(body);
    return this.appointments.bookPublic(dto);
  }

  @Get("mine")
  @Roles("CUSTOMER")
  mine(@Req() req: { user: { sub: string } }) {
    return this.appointments.listMine(req.user.sub);
  }

  @Get()
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  list(@Query("status") status?: string) {
    return this.appointments.list(status);
  }
}
