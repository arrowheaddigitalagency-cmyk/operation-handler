import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { InvoicesService } from "./invoices.service";
import { Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";

@Controller("invoices")
@UseGuards(RolesGuard)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  @Roles("OWNER", "ADMIN", "MANAGER")
  create(@Body() body: unknown) {
    const dto = z
      .object({
        repairCaseId: z.string(),
        subtotal: z.number().nonnegative(),
        taxTotal: z.number().nonnegative().default(0),
        lineItems: z.array(z.record(z.unknown())).optional(),
      })
      .parse(body);
    return this.invoices.create(dto);
  }

  @Get(":id")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION", "CUSTOMER")
  get(@Param("id") id: string, @Req() req: { user: { sub: string; role: string } }) {
    return this.invoices.get(id, req.user);
  }

  @Get(":id/pdf")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION", "CUSTOMER")
  pdf(@Param("id") id: string, @Req() req: { user: { sub: string; role: string } }) {
    return this.invoices.toPdfPayload(id, req.user);
  }
}
