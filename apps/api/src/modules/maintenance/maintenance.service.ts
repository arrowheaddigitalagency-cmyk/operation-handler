import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/core.providers";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private addInterval(from: Date, type: string, value: number) {
    const d = new Date(from);
    if (type === "months") d.setMonth(d.getMonth() + value);
    else if (type === "years") d.setFullYear(d.getFullYear() + value);
    return d;
  }

  async schedule(dto: {
    vehicleId: string;
    ruleCode: string;
    lastServiceAt?: string;
    currentMileage?: number;
  }) {
    const rule = await this.prisma.maintenanceRule.findUnique({ where: { code: dto.ruleCode } });
    if (!rule) throw new NotFoundException("Rule not found");
    const last = dto.lastServiceAt ? new Date(dto.lastServiceAt) : new Date();
    const dueAt =
      rule.intervalType === "kilometers"
        ? null
        : this.addInterval(last, rule.intervalType, rule.intervalValue);
    const dueMileage =
      rule.intervalType === "kilometers" && dto.currentMileage != null
        ? dto.currentMileage + rule.intervalValue
        : null;

    return this.prisma.maintenanceReminder.create({
      data: {
        vehicleId: dto.vehicleId,
        ruleId: rule.id,
        lastServiceAt: last,
        dueAt: dueAt ?? undefined,
        dueMileage: dueMileage ?? undefined,
      },
      include: { rule: true },
    });
  }

  async runDueReminders() {
    const now = new Date();
    const due = await this.prisma.maintenanceReminder.findMany({
      where: {
        sentAt: null,
        OR: [{ dueAt: { lte: now } }],
      },
      include: {
        rule: true,
        vehicle: { include: { customer: { include: { user: true } } } },
      },
      take: 50,
    });

    let enqueued = 0;
    for (const rem of due) {
      const user = rem.vehicle.customer.user;
      if (!user.emailOptIn) continue;
      await this.notifications.enqueueRaw({
        channel: "EMAIL",
        recipient: user.email,
        subject: `Maintenance reminder: ${rem.rule.name}`,
        body: `Hi ${user.firstName}, it's time for ${rem.rule.name} on your ${rem.vehicle.year} ${rem.vehicle.make} ${rem.vehicle.model}. Book your appointment today.`,
        idempotencyKey: `maint_${rem.id}`,
        templateKey: "maintenance_reminder",
      });
      await this.prisma.maintenanceReminder.update({
        where: { id: rem.id },
        data: { sentAt: now },
      });
      enqueued++;
    }
    return { checked: due.length, enqueued };
  }
}
