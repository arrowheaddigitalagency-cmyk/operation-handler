import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { UserRole } from "@cc/domain";
import { PrismaService } from "../../core/core.providers";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private sign(user: { id: string; email: string; role: string }) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async loginWithPassword(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }
    try {
      await this.prisma.auditLog.create({
        data: { actorId: user.id, action: "LOGIN", entityType: "User", entityId: user.id },
      });
    } catch {
      // audit failure must not block login
    }
    return this.sign(user);
  }

  async loginWithTrackingId(trackingId: string, phoneLast4: string) {
    const repair = await this.prisma.repairCase.findUnique({
      where: { trackingId: trackingId.trim().toUpperCase() },
      include: {
        customer: { include: { user: true } },
      },
    });
    if (!repair?.customer?.user) {
      throw new UnauthorizedException("Invalid tracking ID");
    }
    const phone = repair.customer.user.phone ?? "";
    const last4 = phone.replace(/\D/g, "").slice(-4);
    if (last4 !== phoneLast4) {
      throw new UnauthorizedException("Invalid tracking credentials");
    }
    return this.sign(repair.customer.user);
  }

  async registerCustomer(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const org = await this.prisma.organization.findFirst();
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.CUSTOMER,
        organizationId: org?.id,
        customerProfile: { create: {} },
      },
    });
    return this.sign(user);
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        customerProfile: { select: { id: true } },
      },
    });
  }
}
