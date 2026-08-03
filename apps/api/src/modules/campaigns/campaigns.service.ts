import { Injectable } from "@nestjs/common";
import { loadEnv } from "@cc/config";
import { PrismaService } from "../../core/core.providers";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async enrollPostDelivery(repairCaseId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { code: "POST_DELIVERY_FOLLOWUP" },
    });
    if (!campaign || !campaign.active) return null;
    try {
      return await this.prisma.campaignEnrollment.create({
        data: {
          campaignId: campaign.id,
          repairCaseId,
          anchorAt: new Date(),
        },
      });
    } catch {
      return this.prisma.campaignEnrollment.findUnique({
        where: {
          campaignId_repairCaseId: { campaignId: campaign.id, repairCaseId },
        },
      });
    }
  }

  async runDueSteps() {
    const env = loadEnv();
    const enrollments = await this.prisma.campaignEnrollment.findMany({
      where: { completedAt: null },
      include: {
        campaign: { include: { steps: { orderBy: { sortOrder: "asc" } } } },
        repairCase: {
          include: { customer: { include: { user: true } }, vehicle: true },
        },
      },
      take: 100,
    });

    let enqueued = 0;
    const now = Date.now();

    for (const enrollment of enrollments) {
      const user = enrollment.repairCase.customer.user;
      if (!user.marketingOptIn && enrollment.campaign.type !== "FOLLOW_UP") continue;

      let allDone = true;
      for (const step of enrollment.campaign.steps) {
        const dueAt = enrollment.anchorAt.getTime() + step.offsetDays * 24 * 60 * 60 * 1000;
        if (dueAt > now) {
          allDone = false;
          continue;
        }
        const idempotencyKey = `campaign_${enrollment.id}_${step.id}`;
        const existing = await this.prisma.notificationOutbox.findUnique({
          where: { idempotencyKey },
        });
        if (existing) continue;

        const body = this.notifications.render(step.bodyTemplate, {
          firstName: user.firstName,
          googleReviewUrl: env.GOOGLE_REVIEW_URL ?? "",
          trackingId: enrollment.repairCase.trackingId,
          make: enrollment.repairCase.vehicle.make,
          model: enrollment.repairCase.vehicle.model,
        });

        if (!user.emailOptIn) continue;
        await this.notifications.enqueueRaw({
          channel: step.channel,
          recipient: user.email,
          subject: step.subject ?? enrollment.campaign.name,
          body,
          idempotencyKey,
          templateKey: step.templateKey,
          scheduledFor: new Date(dueAt),
        });
        enqueued++;
        allDone = false;
      }

      // mark complete when last step is past due and all outbox rows exist
      const last = enrollment.campaign.steps[enrollment.campaign.steps.length - 1];
      if (last) {
        const lastDue = enrollment.anchorAt.getTime() + last.offsetDays * 24 * 60 * 60 * 1000;
        const lastKey = `campaign_${enrollment.id}_${last.id}`;
        const lastOut = await this.prisma.notificationOutbox.findUnique({
          where: { idempotencyKey: lastKey },
        });
        if (lastDue <= now && lastOut) {
          await this.prisma.campaignEnrollment.update({
            where: { id: enrollment.id },
            data: { completedAt: new Date() },
          });
        } else if (!allDone) {
          // still running
        }
      }
    }

    return { enrollments: enrollments.length, enqueued };
  }
}
