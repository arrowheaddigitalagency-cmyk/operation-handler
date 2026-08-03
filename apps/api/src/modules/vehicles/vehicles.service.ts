import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@cc/domain";
import { PrismaService } from "../../core/core.providers";

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: { sub: string; role: string }, customerId?: string) {
    if (user.role === UserRole.CUSTOMER) {
      const profile = await this.prisma.customerProfile.findUnique({ where: { userId: user.sub } });
      if (!profile) return [];
      return this.prisma.vehicle.findMany({
        where: { customerId: profile.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
    }
    return this.prisma.vehicle.findMany({
      where: { deletedAt: null, ...(customerId ? { customerId } : {}) },
      include: { customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async get(id: string, user: { sub: string; role: string }) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        repairCases: { orderBy: { createdAt: "desc" } },
        maintenanceReminders: { include: { rule: true } },
        customer: { include: { user: true } },
      },
    });
    if (!vehicle || vehicle.deletedAt) throw new NotFoundException("Vehicle not found");
    if (user.role === UserRole.CUSTOMER) {
      const profile = await this.prisma.customerProfile.findUnique({ where: { userId: user.sub } });
      if (!profile || profile.id !== vehicle.customerId) throw new ForbiddenException();
    }
    return vehicle;
  }

  async create(dto: {
    customerId: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
    registrationNumber?: string;
    engineType?: string;
    color?: string;
    mileage?: number;
    paintCode?: string;
  }) {
    return this.prisma.vehicle.create({ data: dto });
  }

  async update(id: string, dto: Record<string, unknown>) {
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }
}
