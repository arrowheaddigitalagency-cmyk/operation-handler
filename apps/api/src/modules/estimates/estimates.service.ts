import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { canFinalizeEstimate, UserRole } from "@cc/domain";
import { Prisma, PrismaService } from "../../core/core.providers";

@Injectable()
export class EstimatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: {
    repairCaseId: string;
    laborTotal: number;
    partsTotal: number;
    taxTotal: number;
    notes?: string;
    lineItems?: Record<string, unknown>[];
  }) {
    const grandTotal = dto.laborTotal + dto.partsTotal + dto.taxTotal;
    return this.prisma.estimate.create({
      data: {
        repairCaseId: dto.repairCaseId,
        laborTotal: dto.laborTotal,
        partsTotal: dto.partsTotal,
        taxTotal: dto.taxTotal,
        grandTotal,
        notes: dto.notes,
        lineItemsJson: (dto.lineItems ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  async finalize(id: string, user: { sub: string; role: string }) {
    if (!canFinalizeEstimate(user.role as UserRole)) {
      throw new ForbiddenException("Only managers can finalize estimates");
    }
    const estimate = await this.prisma.estimate.findUnique({ where: { id } });
    if (!estimate) throw new NotFoundException();
    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: "FINALIZED",
        finalizedAt: new Date(),
        finalizedById: user.sub,
      },
    });
    await this.prisma.repairCase.update({
      where: { id: estimate.repairCaseId },
      data: { costTotal: estimate.grandTotal },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: user.sub,
        action: "ESTIMATE_FINALIZED",
        entityType: "Estimate",
        entityId: id,
      },
    });
    return updated;
  }
}
