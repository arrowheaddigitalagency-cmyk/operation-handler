import { Injectable } from "@nestjs/common";
import { REPAIR_STAGE_LABELS, RepairStage } from "@cc/domain";
import { createNotificationDispatcher, renderTemplate } from "@cc/notifications";
import { loadEnv } from "@cc/config";
import { PrismaService } from "../../core/core.providers";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private dispatcher() {
    const env = loadEnv();
    return createNotificationDispatcher({
      emailProvider: env.EMAIL_PROVIDER,
      smsProvider: env.SMS_PROVIDER,
      emailFrom: env.EMAIL_FROM,
      resendApiKey: env.RESEND_API_KEY,
      twilioAccountSid: env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: env.TWILIO_AUTH_TOKEN,
      twilioFrom: env.TWILIO_FROM_NUMBER,
    });
  }

  async enqueueRaw(input: {
    channel: "EMAIL" | "SMS" | "WHATSAPP";
    recipient: string;
    subject?: string;
    body: string;
    idempotencyKey: string;
    templateKey?: string;
    scheduledFor?: Date;
  }) {
    try {
      return await this.prisma.notificationOutbox.create({
        data: {
          channel: input.channel,
          recipient: input.recipient,
          subject: input.subject,
          body: input.body,
          idempotencyKey: input.idempotencyKey,
          templateKey: input.templateKey,
          scheduledFor: input.scheduledFor ?? new Date(),
        },
      });
    } catch {
      // unique idempotency — ignore duplicate
      return this.prisma.notificationOutbox.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
    }
  }

  async enqueueRepairStatus(repairCaseId: string, stage: RepairStage) {
    const repair = await this.prisma.repairCase.findUnique({
      where: { id: repairCaseId },
      include: { customer: { include: { user: true } }, vehicle: true },
    });
    if (!repair) return;

    const env = loadEnv();
    const appUrl = env.APP_URL.replace(/\/$/, "");
    const user = repair.customer.user;
    const label = REPAIR_STAGE_LABELS[stage];
    const eta = repair.expectedCompletionAt
      ? repair.expectedCompletionAt.toLocaleString()
      : "TBD";
    const vehicleLabel = `${repair.vehicle.year} ${repair.vehicle.make} ${repair.vehicle.model}`;
    const trackUrl = `${appUrl}/track`;

    const body =
      stage === RepairStage.RECEIVED
        ? `Hi ${user.firstName},\n\nYour repair order is open at Cars Compound.\nVehicle: ${vehicleLabel}\nTracking ID: ${repair.trackingId}\nTrack anytime: ${trackUrl}\n\nWe will notify you at each stage until delivery.\n\n— Cars Compound`
        : stage === RepairStage.DELIVERED
          ? `Hi ${user.firstName},\n\nYour ${vehicleLabel} is ready / delivered. Tracking ID: ${repair.trackingId}. Thank you for choosing Cars Compound — we hope to see you again.\n\n— Cars Compound`
          : `Cars Compound update: your ${vehicleLabel} is now "${label}". Tracking ID: ${repair.trackingId}. ETA: ${eta}. Track: ${trackUrl}`;

    const subject =
      stage === RepairStage.RECEIVED
        ? `Cars Compound repair opened — ${repair.trackingId}`
        : stage === RepairStage.DELIVERED
          ? `Cars Compound — delivery complete (${repair.trackingId})`
          : `Cars Compound repair update: ${label}`;

    if (user.emailOptIn && user.email) {
      await this.enqueueRaw({
        channel: "EMAIL",
        recipient: user.email,
        subject,
        body,
        idempotencyKey: `repair_${repairCaseId}_${stage}_email`,
        templateKey: "repair_stage_update",
      });
    }
    if (user.smsOptIn && user.phone) {
      await this.enqueueRaw({
        channel: "SMS",
        recipient: user.phone,
        body:
          stage === RepairStage.RECEIVED
            ? `Cars Compound: repair opened. Tracking ID ${repair.trackingId}. ${trackUrl}`
            : body.slice(0, 320),
        idempotencyKey: `repair_${repairCaseId}_${stage}_sms`,
        templateKey: "repair_stage_update",
      });
    }
  }

  async processOutbox(limit = 20) {
    const due = await this.prisma.notificationOutbox.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: new Date() },
      },
      take: limit,
      orderBy: { scheduledFor: "asc" },
    });

    const dispatcher = this.dispatcher();
    let sent = 0;

    for (const item of due) {
      await this.prisma.notificationOutbox.update({
        where: { id: item.id },
        data: { status: "PROCESSING", attempts: { increment: 1 } },
      });
      try {
        await dispatcher.dispatch({
          channel: item.channel,
          to: item.recipient,
          subject: item.subject ?? undefined,
          body: item.body,
        });
        await this.prisma.notificationOutbox.update({
          where: { id: item.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        await this.prisma.notificationLog.create({
          data: { outboxId: item.id, status: "SENT", detail: "ok" },
        });
        sent++;
      } catch (err) {
        await this.prisma.notificationOutbox.update({
          where: { id: item.id },
          data: {
            status: item.attempts >= 4 ? "FAILED" : "PENDING",
            lastError: err instanceof Error ? err.message : String(err),
            scheduledFor: new Date(Date.now() + 5 * 60 * 1000),
          },
        });
        await this.prisma.notificationLog.create({
          data: {
            outboxId: item.id,
            status: "FAILED",
            detail: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
    return { processed: due.length, sent };
  }

  render(template: string, vars: Record<string, string>) {
    return renderTemplate(template, vars);
  }
}
