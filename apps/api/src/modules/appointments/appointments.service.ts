import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { UserRole } from "@cc/domain";
import { PrismaService } from "../../core/core.providers";
import { NotificationsService } from "../notifications/notifications.service";
import { LeadsService } from "../leads/leads.service";

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly leads: LeadsService,
  ) {}

  async bookPublic(dto: {
    scheduledAt: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    notes?: string;
    damageAnalysisId?: string;
    make?: string;
    model?: string;
    year?: number;
  }) {
    const email = dto.contactEmail.toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { customerProfile: true },
    });

    if (!user) {
      const [firstName, ...rest] = dto.contactName.split(" ");
      const org = await this.prisma.organization.findFirst();
      const passwordHash = await bcrypt.hash(`Temp${Date.now()}!`, 12);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: firstName || "Customer",
          lastName: rest.join(" ") || "Guest",
          phone: dto.contactPhone,
          role: UserRole.CUSTOMER,
          organizationId: org?.id,
          customerProfile: { create: {} },
        },
        include: { customerProfile: true },
      });
    }

    const customerId = user.customerProfile!.id;
    let vehicleId: string | undefined;
    if (dto.make && dto.model && dto.year) {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          customerId,
          make: dto.make,
          model: dto.model,
          year: dto.year,
        },
      });
      vehicleId = vehicle.id;
    }

    const branch = await this.prisma.branch.findFirst();
    const appointment = await this.prisma.appointment.create({
      data: {
        branchId: branch?.id,
        customerId,
        vehicleId,
        damageAnalysisId: dto.damageAnalysisId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
        contactName: dto.contactName,
        contactEmail: email,
        contactPhone: dto.contactPhone,
      },
    });

    await this.notifications.enqueueRaw({
      channel: "EMAIL",
      recipient: email,
      subject: "Inspection appointment received — Cars Compound",
      body: `Hi ${dto.contactName}, we received your inspection request for ${new Date(dto.scheduledAt).toLocaleString()}. Our team will confirm shortly.\n\n— Cars Compound`,
      idempotencyKey: `appt_confirm_${appointment.id}`,
      templateKey: "appointment_received",
    });

    if (dto.contactPhone) {
      await this.notifications.enqueueRaw({
        channel: "SMS",
        recipient: dto.contactPhone,
        body: `Cars Compound: inspection request received for ${new Date(dto.scheduledAt).toLocaleString()}.`,
        idempotencyKey: `appt_confirm_${appointment.id}_sms`,
        templateKey: "appointment_received",
      });
    }

    if (dto.damageAnalysisId) {
      await this.leads.markScheduledFromAppointment(dto.damageAnalysisId, appointment.id);
    } else {
      await this.leads.createFromWebBook({
        appointmentId: appointment.id,
        contactName: dto.contactName,
        contactEmail: email,
        contactPhone: dto.contactPhone,
      });
    }

    return appointment;
  }

  list(status?: string) {
    return this.prisma.appointment.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        customer: { include: { user: true } },
        vehicle: true,
      },
      orderBy: { scheduledAt: "asc" },
      take: 100,
    });
  }

  async listMine(userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (!profile) return [];
    return this.prisma.appointment.findMany({
      where: { customerId: profile.id },
      include: { vehicle: true },
      orderBy: { scheduledAt: "desc" },
      take: 50,
    });
  }
}
