import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  generateTrackingId,
  progressPercent,
  RepairStage,
  REPAIR_STAGE_LABELS,
  UserRole,
  canTransition,
} from "@cc/domain";
import { PrismaService, StorageService } from "../../core/core.providers";
import { NotificationsService } from "../notifications/notifications.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { LeadsService } from "../leads/leads.service";

@Injectable()
export class RepairsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly campaigns: CampaignsService,
    private readonly leads: LeadsService,
  ) {}

  async list(user: { sub: string; role: string }, stage?: string) {
    if (user.role === UserRole.CUSTOMER) {
      const profile = await this.prisma.customerProfile.findUnique({ where: { userId: user.sub } });
      if (!profile) return [];
      return this.prisma.repairCase.findMany({
        where: { customerId: profile.id, deletedAt: null },
        include: { vehicle: true, stageEvents: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
      });
    }
    return this.prisma.repairCase.findMany({
      where: {
        deletedAt: null,
        ...(stage ? { currentStage: stage as RepairStage } : {}),
      },
      include: {
        vehicle: true,
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  async publicTrack(trackingId: string) {
    const repair = await this.prisma.repairCase.findUnique({
      where: { trackingId: trackingId.toUpperCase() },
      select: {
        trackingId: true,
        currentStage: true,
        progressPercent: true,
        expectedCompletionAt: true,
        vehicle: { select: { make: true, model: true, year: true } },
        stageEvents: {
          orderBy: { createdAt: "asc" },
          select: {
            toStage: true,
            notes: true,
            visibleToCustomer: true,
            progressPercent: true,
            createdAt: true,
            expectedCompletionAt: true,
          },
        },
      },
    });
    if (!repair) throw new NotFoundException("Tracking ID not found");
    return {
      ...repair,
      stageEvents: repair.stageEvents.map((ev) => ({
        toStage: ev.toStage,
        progressPercent: ev.progressPercent,
        createdAt: ev.createdAt,
        expectedCompletionAt: ev.expectedCompletionAt,
        notes: ev.visibleToCustomer === false ? undefined : ev.notes ?? undefined,
      })),
      stageLabel: REPAIR_STAGE_LABELS[repair.currentStage as RepairStage],
    };
  }

  async get(id: string, user: { sub: string; role: string }) {
    const repair = await this.prisma.repairCase.findUnique({
      where: { id },
      include: {
        vehicle: true,
        customer: { include: { user: true } },
        stageEvents: { orderBy: { createdAt: "asc" } },
        photos: { where: { deletedAt: null } },
        estimates: true,
        invoices: true,
        warranties: true,
        documents: { where: { deletedAt: null } },
        assignments: { include: { technician: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!repair || repair.deletedAt) throw new NotFoundException("Repair not found");
    if (user.role === UserRole.CUSTOMER) {
      const profile = await this.prisma.customerProfile.findUnique({ where: { userId: user.sub } });
      if (!profile || profile.id !== repair.customerId) throw new ForbiddenException();
      return {
        ...repair,
        technicianNotes: undefined,
        stageEvents: repair.stageEvents
          .filter((ev) => ev.visibleToCustomer !== false)
          .map((ev) => ({ ...ev, notes: ev.visibleToCustomer === false ? null : ev.notes })),
      };
    }
    return repair;
  }

  private async uniqueTrackingId() {
    for (let i = 0; i < 8; i++) {
      const trackingId = generateTrackingId();
      const exists = await this.prisma.repairCase.findUnique({ where: { trackingId } });
      if (!exists) return trackingId;
    }
    throw new BadRequestException("Could not allocate tracking ID");
  }

  async createIntake(
    dto: {
      customerId: string;
      vehicleId: string;
      appointmentId?: string;
      insuranceApplicable: boolean;
      insuranceCompany?: string;
      damageType?: string;
      expectedCompletionAt?: string;
      technicianId?: string;
    },
    actorId: string,
  ) {
    const trackingId = await this.uniqueTrackingId();
    const branch = await this.prisma.branch.findFirst();
    const percent = progressPercent(RepairStage.RECEIVED, dto.insuranceApplicable);

    const repair = await this.prisma.repairCase.create({
      data: {
        trackingId,
        branchId: branch?.id,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        appointmentId: dto.appointmentId,
        insuranceApplicable: dto.insuranceApplicable,
        insuranceCompany: dto.insuranceCompany,
        damageType: dto.damageType,
        expectedCompletionAt: dto.expectedCompletionAt
          ? new Date(dto.expectedCompletionAt)
          : undefined,
        currentStage: RepairStage.RECEIVED,
        progressPercent: percent,
        stageEvents: {
          create: {
            toStage: RepairStage.RECEIVED,
            progressPercent: percent,
            changedById: actorId,
            notes: "Repair order created",
          },
        },
        assignments: dto.technicianId
          ? { create: { technicianId: dto.technicianId } }
          : undefined,
      },
      include: { customer: { include: { user: true } }, vehicle: true },
    });

    await this.notifications.enqueueRepairStatus(repair.id, RepairStage.RECEIVED);
    await this.leads.markConvertedFromRepair(repair.id, dto.appointmentId);
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "REPAIR_CREATED",
        entityType: "RepairCase",
        entityId: repair.id,
        metaJson: { trackingId },
      },
    });

    return repair;
  }

  async changeStage(
    id: string,
    dto: { toStage: string; notes?: string; expectedCompletionAt?: string; visibleToCustomer?: boolean },
    user: { sub: string; role: string },
  ) {
    const repair = await this.prisma.repairCase.findUnique({ where: { id } });
    if (!repair) throw new NotFoundException("Repair not found");

    const toStage = dto.toStage as RepairStage;
    if (!Object.values(RepairStage).includes(toStage)) {
      throw new BadRequestException("Invalid stage");
    }
    if (!canTransition(repair.currentStage as RepairStage, toStage, repair.insuranceApplicable)) {
      throw new BadRequestException("Invalid stage transition");
    }
    if (
      !repair.insuranceApplicable &&
      toStage === RepairStage.INSURANCE_APPROVAL
    ) {
      throw new BadRequestException("Insurance stage not applicable");
    }

    const percent = progressPercent(toStage, repair.insuranceApplicable);
    const updated = await this.prisma.repairCase.update({
      where: { id },
      data: {
        currentStage: toStage,
        progressPercent: percent,
        expectedCompletionAt: dto.expectedCompletionAt
          ? new Date(dto.expectedCompletionAt)
          : repair.expectedCompletionAt,
        technicianNotes: dto.notes ?? repair.technicianNotes,
        completedAt: toStage === RepairStage.DELIVERED ? new Date() : repair.completedAt,
        stageEvents: {
          create: {
            fromStage: repair.currentStage,
            toStage,
            notes: dto.notes,
            visibleToCustomer: dto.visibleToCustomer !== false,
            progressPercent: percent,
            expectedCompletionAt: dto.expectedCompletionAt
              ? new Date(dto.expectedCompletionAt)
              : undefined,
            changedById: user.sub,
          },
        },
      },
      include: { customer: { include: { user: true } }, vehicle: true },
    });

    await this.notifications.enqueueRepairStatus(id, toStage);

    if (toStage === RepairStage.DELIVERED) {
      await this.campaigns.enrollPostDelivery(id);
    }

    return updated;
  }

  async addPhoto(
    id: string,
    file: Express.Multer.File,
    meta: { caption?: string; stage?: string },
  ) {
    if (!file) throw new BadRequestException("file required");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException("Invalid image type");
    if (file.size > 8 * 1024 * 1024) throw new BadRequestException("Image too large");

    const stored = await this.storage.saveImage({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });

    return this.prisma.repairPhoto.create({
      data: {
        repairCaseId: id,
        storageKey: stored.storageKey,
        url: stored.url,
        caption: meta.caption,
        stage: meta.stage as RepairStage | undefined,
      },
    });
  }
}
