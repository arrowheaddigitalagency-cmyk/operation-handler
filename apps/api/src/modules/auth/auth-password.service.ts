import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { loadEnv } from "@cc/config";
import { PrismaService } from "../../core/core.providers";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class AuthPasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  async requestReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    // Always return ok to avoid email enumeration
    if (!user || !user.isActive) return { ok: true };

    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const env = loadEnv();
    const link = `${env.APP_URL.replace(/\/$/, "")}/reset-password?token=${token}`;
    await this.notifications.enqueueRaw({
      channel: "EMAIL",
      recipient: user.email,
      subject: "Cars Compound — password reset",
      body: `Hi ${user.firstName},\n\nReset your password using this link (valid 1 hour):\n${link}\n\nIf you did not request this, ignore this email.\n\n— Cars Compound`,
      idempotencyKey: `pwd_reset_${tokenHash}`,
      templateKey: "password_reset",
    });
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new ForbiddenException("Invalid or expired reset link");
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }
}
