import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z } from "zod";
import { RepairsService } from "./repairs.service";
import { Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { Public } from "../auth/public.decorator";
import { RateLimit, RateLimitGuard } from "../../core/rate-limit.guard";

@Controller("repairs")
@UseGuards(RolesGuard, RateLimitGuard)
export class RepairsController {
  constructor(private readonly repairs: RepairsService) {}

  @Get()
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION", "TECHNICIAN", "CUSTOMER")
  list(@Req() req: { user: { sub: string; role: string } }, @Query("stage") stage?: string) {
    return this.repairs.list(req.user, stage);
  }

  @Public()
  @RateLimit(60, 60_000)
  @Get("track/:trackingId")
  trackPublic(@Param("trackingId") trackingId: string) {
    return this.repairs.publicTrack(trackingId);
  }

  @Get(":id")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION", "TECHNICIAN", "CUSTOMER")
  get(@Param("id") id: string, @Req() req: { user: { sub: string; role: string } }) {
    return this.repairs.get(id, req.user);
  }

  @Post("intake")
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  intake(@Body() body: unknown, @Req() req: { user: { sub: string } }) {
    const dto = z
      .object({
        customerId: z.string(),
        vehicleId: z.string(),
        appointmentId: z.string().optional(),
        insuranceApplicable: z.boolean().default(false),
        insuranceCompany: z.string().optional(),
        damageType: z.string().optional(),
        expectedCompletionAt: z.string().datetime().optional(),
        technicianId: z.string().optional(),
      })
      .parse(body);
    return this.repairs.createIntake(dto, req.user.sub);
  }

  @Post(":id/stage")
  @Roles("OWNER", "ADMIN", "MANAGER", "TECHNICIAN", "RECEPTION")
  advance(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { user: { sub: string; role: string } },
  ) {
    const dto = z
      .object({
        toStage: z.string(),
        notes: z.string().optional(),
        visibleToCustomer: z.boolean().optional(),
        expectedCompletionAt: z.string().datetime().optional(),
      })
      .parse(body);
    return this.repairs.changeStage(id, dto, req.user);
  }

  @Post(":id/photos")
  @Roles("OWNER", "ADMIN", "MANAGER", "TECHNICIAN", "RECEPTION")
  @UseInterceptors(FileInterceptor("file"))
  uploadPhoto(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { caption?: string; stage?: string },
  ) {
    return this.repairs.addPhoto(id, file, body);
  }
}
