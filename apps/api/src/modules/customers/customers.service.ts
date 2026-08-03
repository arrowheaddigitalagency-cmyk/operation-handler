import { randomBytes } from "crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { UserRole } from "@cc/domain";
import { PrismaService } from "../../core/core.providers";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q?: string, page = 1) {
    const take = 20;
    const skip = (Math.max(page, 1) - 1) * take;
    const where = q
      ? {
          OR: [
            { user: { email: { contains: q } } },
            { user: { firstName: { contains: q } } },
            { user: { lastName: { contains: q } } },
            { user: { phone: { contains: q } } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.customerProfile.findMany({
        where,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.customerProfile.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async get(id: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { id },
      include: {
        user: true,
        vehicles: { where: { deletedAt: null } },
        repairCases: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!profile) throw new NotFoundException("Customer not found");
    return profile;
  }

  async create(dto: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone: string;
    notes?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new BadRequestException("Email already exists");
    const org = await this.prisma.organization.findFirst();
    const tempPassword = dto.password ?? `Cc!${randomBytes(6).toString("base64url")}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.CUSTOMER,
        organizationId: org?.id,
        customerProfile: { create: { notes: dto.notes } },
      },
      include: { customerProfile: true },
    });
    return {
      ...user,
      temporaryPassword: dto.password ? undefined : tempPassword,
    };
  }

  async ensureProfileForUser(userId: string) {
    const existing = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.customerProfile.create({ data: { userId } });
  }
}
