import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/core.providers";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getShop() {
    const fallback = {
      shopName: "Cars Compound",
      portalCredit: "Portal by Arrowhead",
      supportEmail: null as string | null,
      supportPhone: null as string | null,
      reportFooter:
        "AI assessment is advisory only. Final estimate confirmed after physical inspection at Cars Compound.",
    };
    try {
      const org = await this.prisma.organization.findFirst();
      if (!org) return fallback;
      let settings = await this.prisma.shopSettings.findUnique({ where: { organizationId: org.id } });
      if (!settings) {
        settings = await this.prisma.shopSettings.create({
          data: {
            organizationId: org.id,
            shopName: org.name || "Cars Compound",
            portalCredit: "Portal by Arrowhead",
          },
        });
      }
      return settings;
    } catch (err) {
      // Demo/prod boot before db:push — don't 500 the marketing site
      // eslint-disable-next-line no-console
      console.error("[settings.getShop] database not ready", err);
      return fallback;
    }
  }

  async updateShop(dto: Record<string, unknown>) {
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException("Organization missing");
    return this.prisma.shopSettings.upsert({
      where: { organizationId: org.id },
      update: dto,
      create: {
        organizationId: org.id,
        shopName: (dto.shopName as string) || "Cars Compound",
        portalCredit: (dto.portalCredit as string) || "Portal by Arrowhead",
        supportEmail: dto.supportEmail as string | undefined,
        supportPhone: dto.supportPhone as string | undefined,
        reportFooter: dto.reportFooter as string | undefined,
      },
    });
  }

  listBands() {
    return this.prisma.repairPriceBand.findMany({ orderBy: [{ partKey: "asc" }, { severity: "asc" }] });
  }

  async upsertBand(dto: {
    partKey: string;
    partLabel: string;
    severity: string;
    costMin: number;
    costMax: number;
    durationDaysMin: number;
    durationDaysMax: number;
    complexity: string;
    currency: string;
    active: boolean;
  }) {
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException("Organization missing");
    return this.prisma.repairPriceBand.upsert({
      where: {
        organizationId_partKey_severity: {
          organizationId: org.id,
          partKey: dto.partKey,
          severity: dto.severity,
        },
      },
      update: dto,
      create: { ...dto, organizationId: org.id },
    });
  }

  patchBand(id: string, dto: Record<string, unknown>) {
    return this.prisma.repairPriceBand.update({ where: { id }, data: dto });
  }
}
