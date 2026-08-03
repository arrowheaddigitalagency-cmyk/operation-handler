import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@cc/domain";
import { PrismaService } from "../../core/core.providers";
import { NotificationsService } from "../notifications/notifications.service";
import { loadEnv } from "@cc/config";

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    user: { sub: string; role: string },
    dto: { subject: string; body: string; repairCaseId?: string; vehicleId?: string },
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException("Customers only");
    }
    const org = await this.prisma.organization.findFirst();
    const ticket = await this.prisma.supportRequest.create({
      data: {
        organizationId: org?.id,
        customerUserId: user.sub,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        repairCaseId: dto.repairCaseId,
        vehicleId: dto.vehicleId,
      },
    });

    const settings = await this.prisma.shopSettings.findFirst();
    const env = loadEnv();
    const notifyTo = settings?.supportEmail || env.EMAIL_FROM;
    await this.notifications.enqueueRaw({
      channel: "EMAIL",
      recipient: notifyTo,
      subject: `Support request: ${ticket.subject}`,
      body: `New support request from customer ${user.sub}\n\n${ticket.subject}\n\n${ticket.body}`,
      idempotencyKey: `support_${ticket.id}_staff`,
      templateKey: "support_new",
    });

    return ticket;
  }

  async listMine(user: { sub: string; role: string }) {
    if (user.role === UserRole.CUSTOMER) {
      return this.prisma.supportRequest.findMany({
        where: { customerUserId: user.sub },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }
    return this.prisma.supportRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        customerUser: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    });
  }

  async updateStaff(
    id: string,
    dto: { status?: string; staffReply?: string; assignedStaffId?: string | null },
  ) {
    const row = await this.prisma.supportRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    const updated = await this.prisma.supportRequest.update({
      where: { id },
      data: {
        status: dto.status as never,
        staffReply: dto.staffReply,
        assignedStaffId: dto.assignedStaffId === undefined ? undefined : dto.assignedStaffId,
      },
      include: { customerUser: true },
    });
    if (dto.staffReply && updated.customerUser.email) {
      await this.notifications.enqueueRaw({
        channel: "EMAIL",
        recipient: updated.customerUser.email,
        subject: `Cars Compound support update: ${updated.subject}`,
        body: `Hi ${updated.customerUser.firstName},\n\n${dto.staffReply}\n\n— Cars Compound`,
        idempotencyKey: `support_${id}_reply_${Date.now()}`,
        templateKey: "support_reply",
      });
    }
    return updated;
  }
}
