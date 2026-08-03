import { UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { loadEnv } from "@cc/config";
import { PrismaService } from "./core.providers";

export function assertCronSecret(secret?: string): void {
  const expected = loadEnv().CRON_SECRET;
  const a = Buffer.from(secret ?? "", "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedException();
  }
}

/** Parse JWT_EXPIRES_IN like 7d / 24h / 3600s / 3600 into milliseconds */
export function jwtExpiresToMs(expiresIn: string): number {
  const m = /^(\d+)([smhd])?$/i.exec(expiresIn.trim());
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = (m[2] || "s").toLowerCase();
  const mult =
    unit === "d" ? 86_400_000 : unit === "h" ? 3_600_000 : unit === "m" ? 60_000 : 1_000;
  return n * mult;
}

/**
 * Best-effort single-instance lock for Hostinger cron overlap.
 * JobLock.id is the lock key.
 */
export async function tryAcquireJobLock(
  prisma: PrismaService,
  key: string,
  ttlMs: number,
  lockedBy = "cron",
): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  await prisma.jobLock.deleteMany({ where: { id: key, expiresAt: { lt: now } } });
  try {
    await prisma.jobLock.create({
      data: { id: key, lockedBy, expiresAt },
    });
    return true;
  } catch {
    return false;
  }
}

export async function releaseJobLock(prisma: PrismaService, key: string): Promise<void> {
  await prisma.jobLock.deleteMany({ where: { id: key } }).catch(() => undefined);
}
