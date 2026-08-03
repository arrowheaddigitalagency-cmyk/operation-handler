import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { SettingsService } from "./settings.service";
import { Public, Roles } from "../auth/public.decorator";
import { RolesGuard } from "../auth/roles.guard";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get("shop")
  shopPublic() {
    return this.settings.getShop();
  }

  @Patch("shop")
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  updateShop(@Body() body: unknown) {
    const dto = z
      .object({
        shopName: z.string().min(1).optional(),
        portalCredit: z.string().optional(),
        supportEmail: z.string().email().optional(),
        supportPhone: z.string().optional(),
        reportFooter: z.string().optional(),
      })
      .parse(body);
    return this.settings.updateShop(dto);
  }

  @Get("price-bands")
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  bands() {
    return this.settings.listBands();
  }

  @Post("price-bands")
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  createBand(@Body() body: unknown) {
    const dto = z
      .object({
        partKey: z.string().min(1),
        partLabel: z.string().min(1),
        severity: z.enum(["minor", "moderate", "severe"]),
        costMin: z.number().nonnegative(),
        costMax: z.number().nonnegative(),
        durationDaysMin: z.number().int().positive(),
        durationDaysMax: z.number().int().positive(),
        complexity: z.enum(["low", "medium", "high"]).default("medium"),
        currency: z.string().default("USD"),
        active: z.boolean().default(true),
      })
      .parse(body);
    return this.settings.upsertBand(dto);
  }

  @Patch("price-bands/:id")
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  patchBand(@Param("id") id: string, @Body() body: unknown) {
    const dto = z
      .object({
        costMin: z.number().nonnegative().optional(),
        costMax: z.number().nonnegative().optional(),
        durationDaysMin: z.number().int().positive().optional(),
        durationDaysMax: z.number().int().positive().optional(),
        active: z.boolean().optional(),
        partLabel: z.string().optional(),
      })
      .parse(body);
    return this.settings.patchBand(id, dto);
  }
}
