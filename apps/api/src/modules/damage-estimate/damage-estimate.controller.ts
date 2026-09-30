import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { z } from "zod";
import { Public, Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { RateLimit, RateLimitGuard } from "../../core/rate-limit.guard";
import { DamageEstimateService } from "./damage-estimate.service";

@Controller("damage-estimate")
@UseGuards(RateLimitGuard)
export class DamageEstimateController {
  constructor(private readonly de: DamageEstimateService) {}

  @Public()
  @RateLimit(30, 60_000)
  @Post("vin/decode")
  decodeVin(@Body() body: unknown) {
    const dto = z.object({ vin: z.string().min(11).max(20) }).parse(body);
    return this.de.decodeVin(dto.vin);
  }

  @Public()
  @RateLimit(20, 60_000)
  @Post("sessions")
  createSession() {
    return this.de.createSession();
  }

  @Public()
  @RateLimit(60, 60_000)
  @Get("sessions/:id")
  getSession(@Param("id") id: string) {
    return this.de.getSession(id);
  }

  @Public()
  @RateLimit(60, 60_000)
  @Get("token/:publicToken")
  byToken(@Param("publicToken") publicToken: string) {
    return this.de.getByToken(publicToken);
  }

  @Public()
  @RateLimit(40, 60_000)
  @Patch("sessions/:id")
  patchSession(@Param("id") id: string, @Body() body: unknown) {
    const dto = z
      .object({
        vin: z.string().optional(),
        vehicleJson: z.unknown().optional(),
        paintJson: z.unknown().optional(),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().optional(),
        pricingMode: z.enum(["OEM", "AFTERMARKET", "MIXED"]).optional(),
      })
      .parse(body);
    return this.de.patchSession(id, dto);
  }

  @Public()
  @RateLimit(20, 60_000)
  @Post("sessions/:id/photos")
  @UseInterceptors(FilesInterceptor("images", 12))
  uploadPhotos(@Param("id") id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.de.uploadPhotos(id, files ?? []);
  }

  @Public()
  @RateLimit(30, 60_000)
  @Delete("sessions/:id/photos/:index")
  removePhoto(@Param("id") id: string, @Param("index") index: string) {
    return this.de.removePhoto(id, Number(index));
  }

  /** Alias path requested by product: POST /api/v1/damage/analyze via rewrite below also */
  @Public()
  @RateLimit(10, 60_000)
  @Post("sessions/:id/analyze")
  analyze(@Param("id") id: string) {
    return this.de.analyze(id);
  }

  @Public()
  @RateLimit(40, 60_000)
  @Patch("sessions/:id/lines/:lineId")
  updateLine(@Param("id") id: string, @Param("lineId") lineId: string, @Body() body: unknown) {
    const dto = z
      .object({
        partName: z.string().optional(),
        operation: z.string().optional(),
        severity: z.string().optional(),
        damageType: z.string().optional(),
        side: z.string().optional(),
        oemPrice: z.number().nullable().optional(),
        aftermarketPrice: z.number().nullable().optional(),
        bodyHours: z.number().nullable().optional(),
        refinishHours: z.number().nullable().optional(),
        blendHours: z.number().nullable().optional(),
      })
      .parse(body);
    return this.de.updateLine(id, lineId, dto);
  }

  @Public()
  @RateLimit(40, 60_000)
  @Post("sessions/:id/price")
  price(@Param("id") id: string, @Body() body: unknown) {
    const dto = z
      .object({ mode: z.enum(["OEM", "AFTERMARKET", "MIXED"]).optional() })
      .parse(body ?? {});
    return this.de.price(id, dto.mode);
  }

  @Public()
  @RateLimit(30, 60_000)
  @Get("slots")
  slots() {
    return this.de.slots();
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post("sessions/:id/book")
  book(@Param("id") id: string, @Body() body: unknown) {
    const dto = z
      .object({
        name: z.string().min(1),
        phone: z.string().min(7),
        email: z.string().email(),
        preferredAt: z.string().min(1),
        slotLabel: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(body);
    return this.de.book(id, dto);
  }

  @Public()
  @RateLimit(20, 60_000)
  @Get("sessions/:id/pdf")
  @Header("Content-Type", "text/html; charset=utf-8")
  async pdf(@Param("id") id: string, @Res() res: Response) {
    const html = await this.de.buildPdfHtml(id);
    res.send(html);
  }

  @Get("admin/sessions")
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN", "MANAGER", "RECEPTION")
  listAdmin(@Query("status") status?: string) {
    return this.de.listAdmin(status);
  }

  @Get("admin/rates")
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  rates() {
    return this.de.getRates();
  }

  @Patch("admin/rates")
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  patchRates(@Body() body: unknown) {
    const dto = z
      .object({
        bodyRatePerHour: z.number().positive().optional(),
        paintRatePerHour: z.number().positive().optional(),
        mechanicalRatePerHour: z.number().positive().optional(),
        frameRatePerHour: z.number().positive().optional(),
        paintMaterialPerRefinishHour: z.number().nonnegative().optional(),
        triCoatMultiplier: z.number().positive().optional(),
        blendMultiplier: z.number().positive().optional(),
        taxRate: z.number().min(0).max(1).optional(),
        markupPercent: z.number().min(0).optional(),
        currency: z.string().optional(),
      })
      .parse(body);
    return this.de.updateRates(dto);
  }
}

/** Extra controller so POST /api/v1/damage/analyze works without touching ai module */
@Controller("damage")
@UseGuards(RateLimitGuard)
export class DamageAnalyzeAliasController {
  constructor(private readonly de: DamageEstimateService) {}

  @Public()
  @RateLimit(10, 60_000)
  @Post("analyze")
  analyze(@Body() body: unknown) {
    const dto = z.object({ sessionId: z.string().min(1) }).parse(body);
    return this.de.analyze(dto.sessionId);
  }
}
