import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { EstimatesService } from "./estimates.service";
import { Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";

@Controller("estimates")
@UseGuards(RolesGuard)
export class EstimatesController {
  constructor(private readonly estimates: EstimatesService) {}

  @Post()
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  create(@Body() body: unknown) {
    const dto = z
      .object({
        repairCaseId: z.string(),
        laborTotal: z.number().nonnegative(),
        partsTotal: z.number().nonnegative(),
        taxTotal: z.number().nonnegative().default(0),
        notes: z.string().optional(),
        lineItems: z.array(z.record(z.unknown())).optional(),
      })
      .parse(body);
    return this.estimates.create(dto);
  }

  @Post(":id/finalize")
  @Roles("OWNER", "ADMIN", "MANAGER")
  finalize(@Param("id") id: string, @Req() req: { user: { sub: string; role: string } }) {
    return this.estimates.finalize(id, req.user);
  }
}
