import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/core.providers";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async opsSummary() {
    const [openRepairs, ready, deliveredMonth, appointments, pendingNotifications] =
      await Promise.all([
        this.prisma.repairCase.count({
          where: { deletedAt: null, currentStage: { not: "DELIVERED" } },
        }),
        this.prisma.repairCase.count({
          where: { currentStage: "READY_FOR_PICKUP" },
        }),
        this.prisma.repairCase.count({
          where: {
            currentStage: "DELIVERED",
            completedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        }),
        this.prisma.appointment.count({ where: { status: "REQUESTED" } }),
        this.prisma.notificationOutbox.count({ where: { status: "PENDING" } }),
      ]);

    const byStage = await this.prisma.repairCase.groupBy({
      by: ["currentStage"],
      where: { deletedAt: null, currentStage: { not: "DELIVERED" } },
      _count: true,
    });

    return {
      openRepairs,
      readyForPickup: ready,
      deliveredThisMonth: deliveredMonth,
      pendingAppointments: appointments,
      pendingNotifications,
      byStage,
    };
  }
}
