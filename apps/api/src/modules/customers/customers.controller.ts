import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { CustomersService } from "./customers.service";
import { Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";

@Controller("customers")
@UseGuards(RolesGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  list(@Query("q") q?: string, @Query("page") page?: string) {
    return this.customers.list(q, Number(page ?? 1));
  }

  @Get(":id")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION", "TECHNICIAN")
  get(@Param("id") id: string) {
    return this.customers.get(id);
  }

  @Post()
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  create(@Body() body: unknown) {
    const dto = z
      .object({
        email: z.string().email(),
        password: z.string().min(8).optional(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().min(7),
        notes: z.string().optional(),
      })
      .parse(body);
    return this.customers.create(dto);
  }
}
