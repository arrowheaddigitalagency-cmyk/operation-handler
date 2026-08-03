import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/core.providers";

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromAiAnalysis(input: {
    damageAnalysisId: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
  }) {
    const org = await this.prisma.organization.findFirst();
    const existing = await this.prisma.lead.findUnique({
      where: { damageAnalysisId: input.damageAnalysisId },
    });
    if (existing) return existing;

    return this.prisma.lead.create({
      data: {
        organizationId: org?.id,
        source: "AI_ASSESS",
        status: "NEW",
        contactName: input.contactName.trim(),
        contactEmail: input.contactEmail.trim().toLowerCase(),
        contactPhone: input.contactPhone.trim(),
        damageAnalysisId: input.damageAnalysisId,
        notes: "Created automatically from AI damage assessment",
      },
    });
  }

  async list(status?: string, page = 1) {
    const take = 50;
    const skip = (Math.max(page, 1) - 1) * take;
    const where = status ? { status: status as never } : undefined;
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          damageAnalysis: {
            select: {
              id: true,
              reportId: true,
              status: true,
              pricedJson: true,
              createdAt: true,
            },
          },
          assignedStaff: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async update(
    id: string,
    data: {
      status?: string;
      notes?: string;
      assignedStaffId?: string | null;
      appointmentId?: string;
      repairCaseId?: string;
    },
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException("Lead not found");
    return this.prisma.lead.update({
      where: { id },
      data: {
        status: data.status as never,
        notes: data.notes,
        assignedStaffId: data.assignedStaffId === undefined ? undefined : data.assignedStaffId,
        appointmentId: data.appointmentId,
        repairCaseId: data.repairCaseId,
      },
    });
  }

  async markScheduledFromAppointment(damageAnalysisId: string | undefined, appointmentId: string) {
    if (!damageAnalysisId) return;
    const lead = await this.prisma.lead.findUnique({ where: { damageAnalysisId } });
    if (!lead) return;
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { status: "INSPECTION_SCHEDULED", appointmentId },
    });
  }

  async createFromWebBook(input: {
    appointmentId: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
  }) {
    const org = await this.prisma.organization.findFirst();
    const existing = await this.prisma.lead.findFirst({
      where: { appointmentId: input.appointmentId },
    });
    if (existing) return existing;

    return this.prisma.lead.create({
      data: {
        organizationId: org?.id,
        source: "WEB_BOOK",
        status: "INSPECTION_SCHEDULED",
        contactName: input.contactName.trim(),
        contactEmail: input.contactEmail.trim().toLowerCase(),
        contactPhone: input.contactPhone.trim(),
        appointmentId: input.appointmentId,
        notes: "Created from web inspection booking",
      },
    });
  }

  async markConvertedFromRepair(repairCaseId: string, appointmentId?: string | null) {
    if (!appointmentId) return null;

    const byAppt = await this.prisma.lead.findFirst({ where: { appointmentId } });
    if (byAppt) {
      return this.prisma.lead.update({
        where: { id: byAppt.id },
        data: { status: "CONVERTED", repairCaseId },
      });
    }

    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (appt?.damageAnalysisId) {
      const byAnalysis = await this.prisma.lead.findUnique({
        where: { damageAnalysisId: appt.damageAnalysisId },
      });
      if (byAnalysis) {
        return this.prisma.lead.update({
          where: { id: byAnalysis.id },
          data: { status: "CONVERTED", repairCaseId, appointmentId },
        });
      }
    }

    return null;
  }
}
