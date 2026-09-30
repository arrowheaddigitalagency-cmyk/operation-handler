import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { loadEnv } from "@cc/config";
import {
  createProviders,
  defaultRateSettings,
  priceEstimate,
  validateVin,
  type DamageAnalyzeResult,
  type EstimateLineInput,
  type PaintType,
  type PricingMode,
  type RateSettings,
} from "@cc/damage-estimate";
import { PrismaService, StorageService } from "../../core/core.providers";
import { AppointmentsService } from "../appointments/appointments.service";

type PhotoMeta = { url: string; storageKey: string; mimeType: string; sizeBytes: number };

@Injectable()
export class DamageEstimateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly appointments: AppointmentsService,
  ) {}

  private providers() {
    const env = loadEnv();
    return createProviders({
      NHTSA_VPIC_BASE_URL: env.NHTSA_VPIC_BASE_URL,
      VIN_PROVIDER: env.VIN_PROVIDER,
      DAMAGE_PROVIDER: env.DAMAGE_PROVIDER === "onnx" || env.DAMAGE_PROVIDER === "gemini" ? "mock" : env.DAMAGE_PROVIDER,
      PARTS_PROVIDER: env.PARTS_PROVIDER,
      LABOR_PROVIDER: env.LABOR_PROVIDER,
      PAINT_PROVIDER: env.PAINT_PROVIDER,
      OPEN_LABOR_API_KEY: env.OPEN_LABOR_API_KEY,
      OPEN_LABOR_BASE_URL: env.OPEN_LABOR_BASE_URL,
    });
  }

  async decodeVin(raw: string) {
    const check = validateVin(raw);
    if (!check.ok) throw new BadRequestException(check.error);
    const env = loadEnv();
    // Prefer live NHTSA; onnx/gemini damage comes later in analyze()
    const vin = createProviders({
      NHTSA_VPIC_BASE_URL: env.NHTSA_VPIC_BASE_URL,
      VIN_PROVIDER: env.VIN_PROVIDER,
    }).vin;
    return vin.decode(check.vin);
  }

  async createSession() {
    const org = await this.prisma.organization.findFirst();
    return this.prisma.damageEstimateSession.create({
      data: {
        organizationId: org?.id,
        status: "DRAFT",
        samplePricing: true,
      },
    });
  }

  async getSession(id: string) {
    const session = await this.prisma.damageEstimateSession.findUnique({
      where: { id },
      include: { lines: { orderBy: { sortOrder: "asc" } }, versions: { orderBy: { createdAt: "asc" } }, bookings: true },
    });
    if (!session) throw new NotFoundException("Estimate session not found");
    return session;
  }

  async getByToken(publicToken: string) {
    const session = await this.prisma.damageEstimateSession.findUnique({
      where: { publicToken },
      include: { lines: { orderBy: { sortOrder: "asc" } }, versions: true, bookings: true },
    });
    if (!session) throw new NotFoundException("Estimate session not found");
    return session;
  }

  async patchSession(
    id: string,
    dto: {
      vin?: string;
      vehicleJson?: unknown;
      paintJson?: unknown;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      pricingMode?: string;
    },
  ) {
    await this.getSession(id);
    if (dto.vin) {
      const check = validateVin(dto.vin);
      if (!check.ok) throw new BadRequestException(check.error);
      dto.vin = check.vin;
    }
    return this.prisma.damageEstimateSession.update({
      where: { id },
      data: {
        vin: dto.vin,
        vehicleJson: dto.vehicleJson as object | undefined,
        paintJson: dto.paintJson as object | undefined,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        pricingMode: dto.pricingMode,
      },
      include: { lines: true },
    });
  }

  async uploadPhotos(id: string, files: Express.Multer.File[]) {
    const env = loadEnv();
    const session = await this.getSession(id);
    if (!files?.length) throw new BadRequestException("At least one photo is required");
    if (files.length > env.DE_MAX_IMAGES) {
      throw new BadRequestException(`Max ${env.DE_MAX_IMAGES} images`);
    }
    const maxBytes = env.DE_MAX_IMAGE_MB * 1024 * 1024;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
    const existing = (session.photosJson as PhotoMeta[] | null) ?? [];
    const added: PhotoMeta[] = [];

    for (const f of files) {
      if (!allowed.has(f.mimetype) && !f.mimetype.startsWith("image/")) {
        throw new BadRequestException(`Unsupported file type: ${f.mimetype}`);
      }
      if (f.size > maxBytes) {
        throw new BadRequestException(`Each image must be under ${env.DE_MAX_IMAGE_MB}MB`);
      }
      const saved = await this.storage.saveImage({
        buffer: f.buffer,
        mimetype: f.mimetype,
        originalname: f.originalname,
      });
      added.push(saved);
    }

    const photos = [...existing, ...added];
    if (photos.length > env.DE_MAX_IMAGES) {
      throw new BadRequestException(`Max ${env.DE_MAX_IMAGES} images total`);
    }

    return this.prisma.damageEstimateSession.update({
      where: { id },
      data: { photosJson: photos },
      include: { lines: true },
    });
  }

  async removePhoto(id: string, index: number) {
    const session = await this.getSession(id);
    const photos = [...((session.photosJson as PhotoMeta[] | null) ?? [])];
    if (index < 0 || index >= photos.length) throw new BadRequestException("Invalid photo index");
    photos.splice(index, 1);
    return this.prisma.damageEstimateSession.update({
      where: { id },
      data: { photosJson: photos },
      include: { lines: true },
    });
  }

  async analyze(id: string) {
    const env = loadEnv();
    const session = await this.getSession(id);
    const photos = (session.photosJson as PhotoMeta[] | null) ?? [];
    if (!photos.length) throw new BadRequestException("Upload photos before analysis");

    const paint = (session.paintJson ?? {}) as { paintType?: PaintType; paintCode?: string };
    const vehicle = (session.vehicleJson ?? {}) as Record<string, string | null>;

    let analysis: DamageAnalyzeResult;
    if (env.DAMAGE_PROVIDER === "onnx" && env.ML_SERVICE_URL) {
      analysis = await this.callOnnxService(env.ML_SERVICE_URL, photos.map((p) => p.url), vehicle, paint);
    } else if (env.DAMAGE_PROVIDER === "gemini" && env.GEMINI_API_KEY) {
      analysis = await this.callGeminiFallback(photos.map((p) => p.url), vehicle, paint);
    } else {
      analysis = await this.providers().damage.analyze({
        imageUrls: photos.map((p) => p.url),
        vehicle: vehicle as never,
        paintType: paint.paintType,
        paintCode: paint.paintCode,
      });
    }

    await this.prisma.damageEstimateVersion.create({
      data: {
        sessionId: id,
        kind: "AI_ANALYSIS",
        label: `provider:${analysis.provider}`,
        payloadJson: analysis as object,
      },
    });

    await this.prisma.damageEstimateLine.deleteMany({ where: { sessionId: id } });

    const parts = this.providers().parts;
    const labor = this.providers().labor;
    let sortOrder = 0;
    for (const d of analysis.detections) {
      const quote = await parts.quote({
        vin: session.vin ?? "UNKNOWN",
        partName: d.partName,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
      });
      const hours = await labor.quote({
        partName: d.partName,
        operation: d.operation,
        severity: d.severity,
        paintType: paint.paintType,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        vin: session.vin,
      });
      await this.prisma.damageEstimateLine.create({
        data: {
          sessionId: id,
          sourceDetectionId: d.id,
          partName: d.partName,
          partNumber: quote.partNumber,
          description: quote.description,
          side: d.side,
          damageType: d.damageType,
          severity: d.severity,
          operation: d.operation,
          confidence: d.confidence,
          bboxJson: d.bbox ?? undefined,
          imageIndex: d.imageIndex,
          oemPrice: quote.oemPrice,
          aftermarketPrice: quote.aftermarketPrice,
          recycledPrice: quote.recycledPrice,
          capaCertified: quote.capaCertified,
          bodyHours: hours.bodyHours,
          structuralHours: hours.structuralHours,
          mechanicalHours: hours.mechanicalHours,
          refinishHours: hours.refinishHours,
          blendHours: hours.blendHours,
          sortOrder: sortOrder++,
        },
      });
    }

    const priced = await this.priceInternal(id, (session.pricingMode as PricingMode) || "MIXED", true);

    await this.prisma.damageEstimateVersion.create({
      data: {
        sessionId: id,
        kind: "ESTIMATE_AI",
        label: "Original AI estimate",
        payloadJson: priced as object,
      },
    });

    return this.getSession(id);
  }

  private async callOnnxService(
    base: string,
    imageUrls: string[],
    vehicle: Record<string, string | null>,
    paint: { paintType?: PaintType; paintCode?: string },
  ): Promise<DamageAnalyzeResult> {
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls, vehicle, paint }),
      });
      if (!res.ok) throw new Error(`ML service ${res.status}`);
      return (await res.json()) as DamageAnalyzeResult;
    } catch (err) {
      // Fall back to mock so the demo never hard-fails
      const mock = await this.providers().damage.analyze({ imageUrls, vehicle: vehicle as never, paintType: paint.paintType });
      mock.notes = [
        ...(mock.notes ?? []),
        `ONNX service unavailable (${err instanceof Error ? err.message : "error"}); using mock`,
      ];
      return mock;
    }
  }

  private async callGeminiFallback(
    imageUrls: string[],
    vehicle: Record<string, string | null>,
    paint: { paintType?: PaintType; paintCode?: string },
  ): Promise<DamageAnalyzeResult> {
    // TODO: full multimodal Gemini call; for now use mock structure with clear note
    // Real Gemini vision wiring lands with ml-service step — keep demo unblocked.
    const mock = await this.providers().damage.analyze({
      imageUrls,
      vehicle: vehicle as never,
      paintType: paint.paintType,
      paintCode: paint.paintCode,
    });
    mock.provider = "gemini_fallback_pending";
    mock.notes = [
      ...(mock.notes ?? []),
      "GEMINI_API_KEY present — full vision fallback will replace this mock payload in the ML step",
    ];
    return mock;
  }

  async updateLine(
    sessionId: string,
    lineId: string,
    dto: Partial<{
      partName: string;
      operation: string;
      severity: string;
      damageType: string;
      side: string;
      oemPrice: number | null;
      aftermarketPrice: number | null;
      bodyHours: number | null;
      refinishHours: number | null;
      blendHours: number | null;
    }>,
  ) {
    await this.getSession(sessionId);
    const line = await this.prisma.damageEstimateLine.findFirst({ where: { id: lineId, sessionId } });
    if (!line) throw new NotFoundException("Line not found");
    await this.prisma.damageEstimateLine.update({
      where: { id: lineId },
      data: { ...dto, editedByStaff: true },
    });
    const priced = await this.priceInternal(sessionId, undefined, true);
    await this.prisma.damageEstimateVersion.create({
      data: {
        sessionId,
        kind: "ESTIMATE_STAFF",
        label: `Staff edit line ${lineId}`,
        payloadJson: priced as object,
      },
    });
    return this.getSession(sessionId);
  }

  async price(sessionId: string, mode?: PricingMode) {
    const priced = await this.priceInternal(sessionId, mode, true);
    await this.prisma.damageEstimateVersion.create({
      data: {
        sessionId,
        kind: "ESTIMATE_PRICED",
        label: `mode:${priced.mode}`,
        payloadJson: priced as object,
      },
    });
    return { ...priced, session: await this.getSession(sessionId) };
  }

  private async priceInternal(sessionId: string, mode?: PricingMode, persist = false) {
    const session = await this.getSession(sessionId);
    const rates = await this.getRates(session.organizationId);
    const pricingMode = (mode ?? session.pricingMode ?? "MIXED") as PricingMode;
    const paint = (session.paintJson ?? {}) as { paintType?: PaintType };
    const lines: EstimateLineInput[] = session.lines.map((l) => ({
      id: l.id,
      partName: l.partName,
      partNumber: l.partNumber ?? undefined,
      description: l.description ?? undefined,
      operation: l.operation as EstimateLineInput["operation"],
      severity: (l.severity as EstimateLineInput["severity"]) ?? "medium",
      side: l.side ?? undefined,
      oemPrice: l.oemPrice,
      aftermarketPrice: l.aftermarketPrice,
      recycledPrice: l.recycledPrice,
      capaCertified: l.capaCertified,
      bodyHours: l.bodyHours ?? undefined,
      structuralHours: l.structuralHours ?? undefined,
      mechanicalHours: l.mechanicalHours ?? undefined,
      refinishHours: l.refinishHours ?? undefined,
      blendHours: l.blendHours ?? undefined,
      subletAmount: l.subletAmount ?? undefined,
    }));

    const anySample = session.samplePricing || session.lines.some((l) => !l.oemPrice && !l.aftermarketPrice);
    const avgConf =
      session.lines.length > 0
        ? session.lines.reduce((s, l) => s + (l.confidence ?? 0.5), 0) / session.lines.length
        : 0.5;

    const priced = priceEstimate({
      lines,
      mode: pricingMode,
      rates,
      paintType: paint.paintType,
      isSamplePricing: anySample,
      confidenceHint: avgConf,
    });

    if (persist) {
      await this.prisma.damageEstimateSession.update({
        where: { id: sessionId },
        data: {
          pricingMode,
          rangeLow: priced.rangeLow,
          rangeHigh: priced.rangeHigh,
          confidence: priced.confidence,
          samplePricing: priced.isSamplePricing,
          status: "PRICED",
        },
      });
    }
    return priced;
  }

  async getRates(organizationId?: string | null): Promise<RateSettings> {
    const orgId =
      organizationId ??
      (await this.prisma.organization.findFirst())?.id ??
      null;
    if (!orgId) return defaultRateSettings();
    let row = await this.prisma.damageEstimateRateSettings.findUnique({ where: { organizationId: orgId } });
    if (!row) {
      const d = defaultRateSettings();
      row = await this.prisma.damageEstimateRateSettings.create({
        data: {
          organizationId: orgId,
          bodyRatePerHour: d.bodyRatePerHour,
          paintRatePerHour: d.paintRatePerHour,
          mechanicalRatePerHour: d.mechanicalRatePerHour,
          frameRatePerHour: d.frameRatePerHour,
          paintMaterialPerRefinishHour: d.paintMaterialPerRefinishHour,
          triCoatMultiplier: d.triCoatMultiplier,
          blendMultiplier: d.blendMultiplier,
          taxRate: d.taxRate,
          markupPercent: d.markupPercent,
          currency: d.currency,
        },
      });
    }
    return {
      bodyRatePerHour: row.bodyRatePerHour,
      paintRatePerHour: row.paintRatePerHour,
      mechanicalRatePerHour: row.mechanicalRatePerHour,
      frameRatePerHour: row.frameRatePerHour,
      paintMaterialPerRefinishHour: row.paintMaterialPerRefinishHour,
      triCoatMultiplier: row.triCoatMultiplier,
      blendMultiplier: row.blendMultiplier,
      taxRate: row.taxRate,
      markupPercent: row.markupPercent,
      currency: row.currency,
    };
  }

  async updateRates(dto: Partial<RateSettings>) {
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new BadRequestException("No organization");
    await this.getRates(org.id);
    return this.prisma.damageEstimateRateSettings.update({
      where: { organizationId: org.id },
      data: {
        bodyRatePerHour: dto.bodyRatePerHour,
        paintRatePerHour: dto.paintRatePerHour,
        mechanicalRatePerHour: dto.mechanicalRatePerHour,
        frameRatePerHour: dto.frameRatePerHour,
        paintMaterialPerRefinishHour: dto.paintMaterialPerRefinishHour,
        triCoatMultiplier: dto.triCoatMultiplier,
        blendMultiplier: dto.blendMultiplier,
        taxRate: dto.taxRate,
        markupPercent: dto.markupPercent,
        currency: dto.currency,
      },
    });
  }

  async book(
    sessionId: string,
    dto: {
      name: string;
      phone: string;
      email: string;
      preferredAt: string;
      slotLabel?: string;
      notes?: string;
    },
  ) {
    const session = await this.getSession(sessionId);
    const vehicle = (session.vehicleJson ?? {}) as { year?: string; make?: string; model?: string };
    const yearNum = vehicle.year ? parseInt(vehicle.year, 10) : undefined;

    const appt = await this.appointments.bookPublic({
      scheduledAt: dto.preferredAt,
      contactName: dto.name,
      contactEmail: dto.email,
      contactPhone: dto.phone,
      notes: dto.notes ?? `Damage estimate session ${sessionId}`,
      make: vehicle.make ?? undefined,
      model: vehicle.model ?? undefined,
      year: yearNum && !Number.isNaN(yearNum) ? yearNum : undefined,
    });

    await this.prisma.damageEstimateBooking.create({
      data: {
        sessionId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        preferredAt: new Date(dto.preferredAt),
        slotLabel: dto.slotLabel,
        notes: dto.notes,
        appointmentId: appt.id,
      },
    });

    await this.prisma.damageEstimateSession.update({
      where: { id: sessionId },
      data: {
        status: "BOOKED",
        appointmentId: appt.id,
        customerName: dto.name,
        customerEmail: dto.email,
        customerPhone: dto.phone,
      },
    });

    return { appointment: appt, session: await this.getSession(sessionId) };
  }

  async listAdmin(status?: string) {
    return this.prisma.damageEstimateSession.findMany({
      where: status ? { status: status as never } : undefined,
      include: { lines: true, bookings: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async slots() {
    // Simple stub slots for next 5 business-ish days at 9am/1pm/3pm local
    const out: { iso: string; label: string }[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let d = 1; d <= 7 && out.length < 9; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + d);
      if (day.getDay() === 0) continue;
      for (const hour of [9, 13, 15]) {
        const slot = new Date(day);
        slot.setHours(hour, 0, 0, 0);
        out.push({
          iso: slot.toISOString(),
          label: slot.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        });
      }
    }
    return out.slice(0, 9);
  }

  buildPdfHtml(sessionId: string) {
    return this.getSession(sessionId).then((s) => {
      const range =
        s.rangeLow != null && s.rangeHigh != null
          ? `$${s.rangeLow.toFixed(0)} – $${s.rangeHigh.toFixed(0)}`
          : "Pending";
      const lines = s.lines
        .map(
          (l) =>
            `<tr><td>${escapeHtml(l.partName)}</td><td>${escapeHtml(l.operation)}</td><td>${escapeHtml(l.severity ?? "")}</td><td>${l.oemPrice != null ? "$" + l.oemPrice : "data needed"}</td><td>${l.aftermarketPrice != null ? "$" + l.aftermarketPrice : "data needed"}</td></tr>`,
        )
        .join("");
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Estimate ${s.id}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}.badge{display:inline-block;background:#fef3c7;padding:2px 8px;border-radius:4px;font-size:12px}.note{color:#555;font-size:13px;margin-top:16px}</style></head><body>
<h1>Cars Compound — Damage Estimate</h1>
<p>VIN: ${escapeHtml(s.vin ?? "—")} · Status: ${s.status}</p>
${s.samplePricing ? '<p class="badge">Sample pricing — not a final shop invoice</p>' : ""}
<p><strong>Estimated range:</strong> ${range} · Confidence: ${s.confidence != null ? Math.round(s.confidence * 100) + "%" : "—"}</p>
<table><thead><tr><th>Part</th><th>Op</th><th>Severity</th><th>OEM</th><th>Aftermarket</th></tr></thead><tbody>${lines}</tbody></table>
<p class="note">Preliminary advisory estimate until a technician inspects the vehicle. Not a CCC ONE / Mitchell / Audatex insurance estimate.</p>
</body></html>`;
    });
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
