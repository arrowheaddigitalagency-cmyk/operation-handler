import { Controller, Headers, Post } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { PrismaService } from "../../core/core.providers";
import {
  assertCronSecret,
  releaseJobLock,
  tryAcquireJobLock,
} from "../../core/cron-auth";

@Controller("system")
export class SystemController {
  constructor(private readonly prisma: PrismaService) {}

  /** Hostinger cron: purge expired/used password-reset tokens + stale SENT outbox (>90d). */
  @Public()
  @Post("cleanup")
  async cleanup(@Headers("x-cron-secret") secret?: string) {
    assertCronSecret(secret);
    const lockKey = "cron:system-cleanup";
    if (!(await tryAcquireJobLock(this.prisma, lockKey, 10 * 60_000))) {
      return { skipped: true, reason: "lock_held" };
    }
    try {
      const now = new Date();
      const outboxCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const [tokens, outbox] = await Promise.all([
        this.prisma.passwordResetToken.deleteMany({
          where: {
            OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
          },
        }),
        this.prisma.notificationOutbox.deleteMany({
          where: {
            status: "SENT",
            sentAt: { lt: outboxCutoff },
          },
        }),
      ]);

      return {
        ok: true,
        passwordResetTokensDeleted: tokens.count,
        sentOutboxDeleted: outbox.count,
      };
    } finally {
      await releaseJobLock(this.prisma, lockKey);
    }
  }
}
