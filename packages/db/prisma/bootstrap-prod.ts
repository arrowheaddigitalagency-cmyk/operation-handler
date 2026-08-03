/**
 * Production bootstrap (no demo seed passwords).
 * Creates org + shop settings + default price bands if missing.
 *
 * Usage (after migrate deploy):
 *   pnpm --filter @cc/db exec tsx prisma/bootstrap-prod.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_PROD_BOOTSTRAP !== "1") {
    console.log("Set ALLOW_PROD_BOOTSTRAP=1 or NODE_ENV=production to run.");
    return;
  }

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (>=12 chars) required");
  }

  let org = await prisma.organization.findFirst({ where: { slug: "cars-compound" } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: randomUUID(),
        name: "Cars Compound",
        slug: "cars-compound",
      },
    });
    console.log("Created organization", org.id);
  }

  const settings = await prisma.shopSettings.findUnique({ where: { organizationId: org.id } });
  if (!settings) {
    await prisma.shopSettings.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        shopName: "Cars Compound",
        portalCredit: "Portal by Arrowhead",
      },
    });
    console.log("Created shop settings");
  }

  let branch = await prisma.branch.findFirst({ where: { organizationId: org.id } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        name: "Main",
        code: "MAIN",
        timezone: process.env.APP_TIMEZONE || "America/New_York",
      },
    });
    console.log("Created branch", branch.id);
  }

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        branchId: branch.id,
        email: adminEmail,
        passwordHash: await hash(adminPassword, 12),
        role: "OWNER",
        firstName: "Admin",
        lastName: "User",
        emailOptIn: true,
        smsOptIn: false,
      },
    });
    console.log("Created OWNER", admin.email);
  } else {
    console.log("Admin already exists:", adminEmail);
  }

  console.log("Bootstrap complete. Rotate BOOTSTRAP_ADMIN_PASSWORD env if it was temporary.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
