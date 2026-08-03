import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@cc/domain";
import { Prisma, PrismaService } from "../../core/core.providers";

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumber() {
    const count = await this.prisma.invoice.count();
    return `INV-${String(count + 1).padStart(6, "0")}`;
  }

  async create(dto: {
    repairCaseId: string;
    subtotal: number;
    taxTotal: number;
    lineItems?: Record<string, unknown>[];
  }) {
    const number = await this.nextNumber();
    const grandTotal = dto.subtotal + dto.taxTotal;
    return this.prisma.invoice.create({
      data: {
        repairCaseId: dto.repairCaseId,
        number,
        subtotal: dto.subtotal,
        taxTotal: dto.taxTotal,
        grandTotal,
        status: "ISSUED",
        issuedAt: new Date(),
        lineItemsJson: (dto.lineItems ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  async get(id: string, user?: { sub: string; role: string }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        repairCase: {
          include: {
            customer: { include: { user: true } },
            vehicle: true,
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException();
    if (user?.role === UserRole.CUSTOMER) {
      const profile = await this.prisma.customerProfile.findUnique({ where: { userId: user.sub } });
      if (!profile || profile.id !== invoice.repairCase.customerId) {
        throw new ForbiddenException();
      }
    }
    return invoice;
  }

  /** Lightweight printable payload (client can render PDF). */
  async toPdfPayload(id: string, user?: { sub: string; role: string }) {
    const invoice = await this.get(id, user);
    return {
      title: `Invoice ${invoice.number}`,
      issuedAt: invoice.issuedAt,
      customer: invoice.repairCase.customer.user,
      vehicle: invoice.repairCase.vehicle,
      trackingId: invoice.repairCase.trackingId,
      subtotal: invoice.subtotal,
      taxTotal: invoice.taxTotal,
      grandTotal: invoice.grandTotal,
      currency: invoice.currency,
      lineItems: invoice.lineItemsJson,
    };
  }
}
