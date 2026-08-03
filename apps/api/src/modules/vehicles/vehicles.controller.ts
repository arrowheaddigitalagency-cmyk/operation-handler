import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { VehiclesService } from "./vehicles.service";
import { Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";

const vehicleSchema = z.object({
  customerId: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1950).max(2100),
  vin: z.string().optional(),
  registrationNumber: z.string().optional(),
  engineType: z.string().optional(),
  color: z.string().optional(),
  mileage: z.number().int().optional(),
  paintCode: z.string().optional(),
});

@Controller("vehicles")
@UseGuards(RolesGuard)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION", "TECHNICIAN", "CUSTOMER")
  list(
    @Req() req: { user: { sub: string; role: string } },
    @Query("customerId") customerId?: string,
  ) {
    return this.vehicles.list(req.user, customerId);
  }

  @Get(":id")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION", "TECHNICIAN", "CUSTOMER")
  get(@Param("id") id: string, @Req() req: { user: { sub: string; role: string } }) {
    return this.vehicles.get(id, req.user);
  }

  @Post()
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION", "CUSTOMER")
  create(@Body() body: unknown) {
    return this.vehicles.create(vehicleSchema.parse(body));
  }

  @Patch(":id")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  update(@Param("id") id: string, @Body() body: unknown) {
    const dto = vehicleSchema.partial().omit({ customerId: true }).parse(body);
    return this.vehicles.update(id, dto);
  }
}
