import { BadRequestException, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { generateTrackingId, progressPercent, RepairStage, UserRole } from "@cc/domain";
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

  private async uniqueTrackingId() {
    for (let i = 0; i < 8; i++) {
      const trackingId = generateTrackingId();
      const exists = await this.prisma.repairCase.findUnique({ where: { trackingId } });
      if (!exists) return trackingId;
    }
    throw new BadRequestException("Could not allocate tracking ID");
  }

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
    const email = dto.contactEmail.toLowerCase().trim();
    const phone = dto.contactPhone.trim();
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException("Invalid appointment date/time");
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { customerProfile: true },
    });

    if (!user) {
      const [firstName, ...rest] = dto.contactName.trim().split(/\s+/);
      const org = await this.prisma.organization.findFirst();
      const passwordHash = await bcrypt.hash(`Temp${Date.now()}!`, 12);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: firstName || "Customer",
          lastName: rest.join(" ") || "Guest",
          phone,
          role: UserRole.CUSTOMER,
          organizationId: org?.id,
          customerProfile: { create: {} },
        },
        include: { customerProfile: true },
      });
    } else if (!user.customerProfile) {
      // Staff/admin emails used on the public form still need a customer profile
      const profile = await this.prisma.customerProfile.create({
        data: { userId: user.id },
      });
      user = { ...user, customerProfile: profile };
    } else if (phone && !user.phone) {
      await this.prisma.user.update({ where: { id: user.id }, data: { phone } });
    }

    const customerId = user.customerProfile!.id;
    const year = dto.year && dto.year > 1900 ? dto.year : new Date().getFullYear();
    const vehicle = await this.prisma.vehicle.create({
      data: {
        customerId,
        make: (dto.make || "TBD").trim() || "TBD",
        model: (dto.model || "TBD").trim() || "TBD",
        year,
      },
    });

    const branch = await this.prisma.branch.findFirst();
    const appointment = await this.prisma.appointment.create({
      data: {
        branchId: branch?.id,
        customerId,
        vehicleId: vehicle.id,
        damageAnalysisId: dto.damageAnalysisId,
        scheduledAt,
        notes: dto.notes,
        contactName: dto.contactName.trim(),
        contactEmail: email,
        contactPhone: phone,
      },
    });

    const trackingId = await this.uniqueTrackingId();
    const percent = progressPercent(RepairStage.RECEIVED, false);
    const repair = await this.prisma.repairCase.create({
      data: {
        trackingId,
        branchId: branch?.id,
        customerId,
        vehicleId: vehicle.id,
        appointmentId: appointment.id,
        currentStage: RepairStage.RECEIVED,
        progressPercent: percent,
        damageType: dto.notes?.slice(0, 120),
        stageEvents: {
          create: {
            toStage: RepairStage.RECEIVED,
            progressPercent: percent,
            changedById: user.id,
            notes: "Opened from web booking — awaiting shop intake confirmation",
            visibleToCustomer: true,
          },
        },
      },
    });

    if (dto.damageAnalysisId) {
      await this.leads.markScheduledFromAppointment(dto.damageAnalysisId, appointment.id);
      // If AI lead was missing, still create a book lead so CRM isn't empty
      const aiLead = await this.prisma.lead.findUnique({
        where: { damageAnalysisId: dto.damageAnalysisId },
      });
      if (!aiLead) {
        await this.leads.createFromWebBook({
          appointmentId: appointment.id,
          contactName: dto.contactName,
          contactEmail: email,
          contactPhone: phone,
        });
      }
    } else {
      await this.leads.createFromWebBook({
        appointmentId: appointment.id,
        contactName: dto.contactName,
        contactEmail: email,
        contactPhone: phone,
      });
    }
    await this.leads.markConvertedFromRepair(repair.id, appointment.id);

    const when = scheduledAt.toLocaleString();
    await this.notifications.enqueueRaw({
      channel: "EMAIL",
      recipient: email,
      subject: `Inspection booked — Tracking ${trackingId}`,
      body: `Hi ${dto.contactName},\n\nWe received your inspection request for ${when}.\nTracking ID: ${trackingId}\nTrack anytime: use Tracking ID on the Track page (and last 4 of your phone to sign in).\n\nOur team will confirm shortly.\n\n— Cars Compound`,
      idempotencyKey: `appt_confirm_${appointment.id}`,
      templateKey: "appointment_received",
    });

    if (phone) {
      await this.notifications.enqueueRaw({
        channel: "SMS",
        recipient: phone,
        body: `Cars Compound: booked for ${when}. Tracking ID ${trackingId}.`,
        idempotencyKey: `appt_confirm_${appointment.id}_sms`,
        templateKey: "appointment_received",
      });
    }

    await this.notifications.enqueueRepairStatus(repair.id, RepairStage.RECEIVED);

    return { ...appointment, trackingId, repairCaseId: repair.id };
  }

  list(status?: string) {
    return this.prisma.appointment.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        customer: { include: { user: true } },
        vehicle: true,
        repairCase: { select: { id: true, trackingId: true, currentStage: true } },
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
