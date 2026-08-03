import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createAIOrchestrator, AI_ESTIMATE_DISCLAIMER } from "@cc/ai";
import {
  applyShopPricing,
  generateReportId,
  type DamageAnalysisResult,
  type PricedAnalysis,
} from "@cc/domain";
import { loadEnv } from "@cc/config";
import { PrismaService, StorageService, LoggerService } from "../../core/core.providers";
import { Prisma } from "@cc/db";
import { NotificationsService } from "../notifications/notifications.service";
import { LeadsService } from "../leads/leads.service";

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly logger: LoggerService,
    private readonly notifications: NotificationsService,
    private readonly leads: LeadsService,
  ) {}

  private async uniqueReportId() {
    for (let i = 0; i < 8; i++) {
      const reportId = generateReportId();
      const exists = await this.prisma.damageAnalysis.findUnique({ where: { reportId } });
      if (!exists) return reportId;
    }
    throw new BadRequestException("Could not allocate report ID");
  }

  async submitDamageAnalysis(
    files: Express.Multer.File[],
    meta: {
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      make?: string;
      model?: string;
      year?: number;
    },
  ) {
    const env = loadEnv();
    if (!meta.guestName?.trim() || !meta.guestEmail?.trim() || !meta.guestPhone?.trim()) {
      throw new BadRequestException("Name, email, and phone are required for your repair report");
    }
    if (!files.length) throw new BadRequestException("Upload at least one image");
    if (files.length > env.AI_MAX_IMAGES) {
      throw new BadRequestException(`Max ${env.AI_MAX_IMAGES} images`);
    }
    const maxBytes = env.AI_MAX_IMAGE_MB * 1024 * 1024;
    for (const f of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.mimetype)) {
        throw new BadRequestException("Only JPEG/PNG/WebP allowed");
      }
      if (f.size > maxBytes) throw new BadRequestException("Image too large");
    }

    const orchestrator = createAIOrchestrator({
      provider: env.AI_PROVIDER,
      openaiApiKey: env.OPENAI_API_KEY,
      openaiModel: env.OPENAI_VISION_MODEL,
      geminiApiKey: env.GEMINI_API_KEY,
      geminiModel: env.GEMINI_VISION_MODEL,
    });

    const reportId = await this.uniqueReportId();
    const analysis = await this.prisma.damageAnalysis.create({
      data: {
        reportId,
        guestName: meta.guestName.trim(),
        guestEmail: meta.guestEmail.trim().toLowerCase(),
        guestPhone: meta.guestPhone.trim(),
        status: "PROCESSING",
        provider: orchestrator.providerMeta.provider,
        modelVersion: orchestrator.providerMeta.modelVersion,
        disclaimer: AI_ESTIMATE_DISCLAIMER,
      },
    });

    void this.processAnalysis(analysis.id, files, meta).catch((err) =>
      this.logger.error("AI analysis failed", { err: String(err), id: analysis.id }),
    );

    return {
      id: analysis.id,
      reportId,
      status: "PROCESSING",
      disclaimer: AI_ESTIMATE_DISCLAIMER,
      pollUrl: `/api/v1/ai/damage-analysis/${analysis.id}`,
      reportUrl: `/report/${reportId}`,
    };
  }

  private async processAnalysis(
    id: string,
    files: Express.Multer.File[],
    meta: {
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      make?: string;
      model?: string;
      year?: number;
    },
  ) {
    const env = loadEnv();
    const stored = [];
    for (const f of files) {
      const s = await this.storage.saveImage({
        buffer: f.buffer,
        mimetype: f.mimetype,
        originalname: f.originalname,
      });
      stored.push(s);
      await this.prisma.damageImage.create({
        data: {
          analysisId: id,
          storageKey: s.storageKey,
          url: s.url,
          mimeType: s.mimeType,
          sizeBytes: s.sizeBytes,
        },
      });
    }

    const orchestrator = createAIOrchestrator({
      provider: env.AI_PROVIDER,
      openaiApiKey: env.OPENAI_API_KEY,
      openaiModel: env.OPENAI_VISION_MODEL,
      geminiApiKey: env.GEMINI_API_KEY,
      geminiModel: env.GEMINI_VISION_MODEL,
    });

    try {
      const raw = await orchestrator.runDamageAnalysis({
        images: stored.map((s, i) => ({
          url: s.url.startsWith("http") ? s.url : undefined,
          base64: s.url.startsWith("http") ? undefined : files[i]!.buffer.toString("base64"),
          mimeType: s.mimeType,
        })),
        vehicleHint: { make: meta.make, model: meta.model, year: meta.year },
        currency: env.CURRENCY,
      });

      const bands = await this.prisma.repairPriceBand.findMany({ where: { active: true } });
      const priced: PricedAnalysis = applyShopPricing(raw.findings, bands, {
        currency: env.CURRENCY,
        confidence: raw.confidence,
        summary: raw.summary,
      });

      const LOW_CONFIDENCE = 0.55;
      if ((raw.confidence ?? 0) < LOW_CONFIDENCE || !raw.findings.length) {
        const updated = await this.prisma.damageAnalysis.update({
          where: { id },
          data: {
            status: "NEEDS_MORE_IMAGES",
            resultJson: {
              findings: raw.findings,
              confidence: raw.confidence,
              summary: raw.summary,
              caveats: [
                AI_ESTIMATE_DISCLAIMER,
                "Confidence is too low for a reliable advisory report. Please upload clearer photos from multiple angles.",
              ],
            },
            pricedJson: Prisma.DbNull,
            modelVersion: orchestrator.providerMeta.modelVersion,
            errorMessage: "Low confidence — additional images required",
          },
        });

        await this.leads.createFromAiAnalysis({
          damageAnalysisId: id,
          contactName: meta.guestName,
          contactEmail: meta.guestEmail,
          contactPhone: meta.guestPhone,
        });

        const appUrl = env.APP_URL.replace(/\/$/, "");
        await this.notifications.enqueueRaw({
          channel: "EMAIL",
          recipient: meta.guestEmail.trim().toLowerCase(),
          subject: `Cars Compound — more photos needed (${updated.reportId})`,
          body: `Hi ${meta.guestName},\n\nWe could not generate a reliable damage report yet (confidence too low).\nReport ID: ${updated.reportId}\n\nPlease return to the assess page and upload clearer photos from multiple angles:\n${appUrl}/assess\n\nOr book a physical inspection:\n${appUrl}/book?analysisId=${id}&reportId=${updated.reportId}\n\n— Cars Compound`,
          idempotencyKey: `ai_low_conf_${id}_email`,
          templateKey: "ai_needs_more_images",
        });
        return;
      }

      const resultForStore: DamageAnalysisResult = {
        findings: priced.findings,
        complexity: priced.complexity,
        durationDaysMin: priced.durationDaysMin,
        durationDaysMax: priced.durationDaysMax,
        costMin: priced.costMin,
        costMax: priced.costMax,
        currency: priced.currency,
        confidence: priced.confidence,
        caveats: priced.caveats,
        summary: priced.summary,
      };

      const updated = await this.prisma.damageAnalysis.update({
        where: { id },
        data: {
          status: "COMPLETED",
          resultJson: resultForStore,
          pricedJson: priced,
          modelVersion: orchestrator.providerMeta.modelVersion,
        },
      });

      await this.leads.createFromAiAnalysis({
        damageAnalysisId: id,
        contactName: meta.guestName,
        contactEmail: meta.guestEmail,
        contactPhone: meta.guestPhone,
      });

      const appUrl = env.APP_URL.replace(/\/$/, "");
      await this.notifications.enqueueRaw({
        channel: "EMAIL",
        recipient: meta.guestEmail.trim().toLowerCase(),
        subject: `Your Cars Compound damage report (${updated.reportId})`,
        body: `Hi ${meta.guestName},\n\nYour AI damage assessment is ready.\nReport ID: ${updated.reportId}\nAdvisory range: ${priced.currency} ${priced.costMin.toLocaleString()} – ${priced.costMax.toLocaleString()}\nEstimated duration: ${priced.durationDaysMin}–${priced.durationDaysMax} days\n\nView / print your report:\n${appUrl}/report/${updated.reportId}\n\nBook an inspection:\n${appUrl}/book?analysisId=${id}&reportId=${updated.reportId}\n\n${AI_ESTIMATE_DISCLAIMER}\n\n— Cars Compound`,
        idempotencyKey: `ai_report_${id}_email`,
        templateKey: "ai_report_ready",
      });

      if (meta.guestPhone) {
        await this.notifications.enqueueRaw({
          channel: "SMS",
          recipient: meta.guestPhone.trim(),
          body: `Cars Compound: your damage report ${updated.reportId} is ready. ${appUrl}/report/${updated.reportId}`,
          idempotencyKey: `ai_report_${id}_sms`,
          templateKey: "ai_report_ready",
        });
      }
    } catch (err) {
      await this.prisma.damageAnalysis.update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  }

  async getAnalysis(id: string) {
    const row = await this.prisma.damageAnalysis.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!row) throw new NotFoundException();
    return this.toPublicAnalysis(row);
  }

  async getByReportId(reportId: string) {
    const row = await this.prisma.damageAnalysis.findUnique({
      where: { reportId: reportId.toUpperCase() },
      include: { images: true },
    });
    if (!row) throw new NotFoundException("Report not found");
    const settings = await this.prisma.shopSettings.findFirst();
    return {
      analysis: this.toPublicAnalysis(row),
      settings: settings
        ? {
            shopName: settings.shopName,
            portalCredit: settings.portalCredit,
            reportFooter: settings.reportFooter,
          }
        : null,
    };
  }

  private toPublicAnalysis(row: {
    id: string;
    reportId: string;
    status: string;
    disclaimer: string | null;
    resultJson: unknown;
    pricedJson: unknown;
    errorMessage: string | null;
    createdAt: Date;
    images?: Array<{ id: string; url: string; mimeType: string }>;
    guestName?: string | null;
  }) {
    return {
      id: row.id,
      reportId: row.reportId,
      status: row.status,
      disclaimer: row.disclaimer,
      resultJson: row.resultJson,
      pricedJson: row.pricedJson,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      guestName: row.guestName ?? undefined,
      images: (row.images ?? []).map((img) => ({
        id: img.id,
        url: img.url,
        mimeType: img.mimeType,
      })),
    };
  }

  async getReportHtml(reportId: string) {
    const { analysis, settings } = await this.getByReportId(reportId);
    if (analysis.status !== "COMPLETED") {
      throw new BadRequestException(
        analysis.status === "NEEDS_MORE_IMAGES"
          ? "Report not ready — additional images required"
          : "Report not ready yet",
      );
    }
    const priced = (analysis.pricedJson ?? analysis.resultJson) as PricedAnalysis | null;
    const shop = settings?.shopName ?? "Cars Compound";
    const credit = settings?.portalCredit ?? "Portal by Arrowhead";
    const footer = settings?.reportFooter ?? AI_ESTIMATE_DISCLAIMER;
    const lines =
      priced?.lines
        ?.map(
          (l) =>
            `<tr><td>${escapeHtml(l.part)}</td><td>${escapeHtml(l.severity)}</td><td>${escapeHtml(l.description)}</td><td>${priced.currency} ${l.costMin.toLocaleString()}–${l.costMax.toLocaleString()}</td></tr>`,
        )
        .join("") ?? "";

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(shop)} Damage Report ${escapeHtml(analysis.reportId)}</title>
<style>
  body{font-family:Georgia,serif;color:#1a1a1a;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.45}
  h1{font-size:28px;margin:0} .sub{color:#555;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin:24px 0} th,td{border-bottom:1px solid #ddd;padding:10px;text-align:left;font-size:14px}
  .box{border:1px solid #ddd;padding:16px;margin:16px 0} .muted{color:#666;font-size:12px}
  @media print{body{margin:0} .noprint{display:none}}
</style></head><body>
  <p class="sub">${escapeHtml(shop)} · AI Damage Assessment</p>
  <h1>Repair Advisory Report</h1>
  <p>Report ID: <strong>${escapeHtml(analysis.reportId)}</strong><br/>
  Prepared for: ${escapeHtml(analysis.guestName ?? "Customer")}<br/>
  Date: ${new Date(analysis.createdAt).toLocaleString()}</p>
  <div class="box"><strong>Summary</strong><br/>${escapeHtml(priced?.summary ?? "")}</div>
  <table><thead><tr><th>Part</th><th>Severity</th><th>Finding</th><th>Shop range</th></tr></thead>
  <tbody>${lines}</tbody></table>
  <div class="box">
    <strong>Advisory total:</strong> ${escapeHtml(priced?.currency ?? "USD")} ${(priced?.costMin ?? 0).toLocaleString()} – ${(priced?.costMax ?? 0).toLocaleString()}<br/>
    <strong>Advisory duration:</strong> ${priced?.durationDaysMin ?? "—"}–${priced?.durationDaysMax ?? "—"} days<br/>
    <strong>Complexity:</strong> ${escapeHtml(priced?.complexity ?? "—")}<br/>
    <span class="muted">Pricing from Cars Compound configurable repair price bands (not raw AI guesses).</span>
  </div>
  <p class="muted">${escapeHtml(footer)}</p>
  <p class="muted noprint"><button onclick="window.print()">Print / Save as PDF</button></p>
  <p class="muted">${escapeHtml(credit)}</p>
</body></html>`;
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
