import { PrismaClient, UserRole, CampaignType, NotificationChannel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") {
    console.error(
      "Refusing to seed in NODE_ENV=production. Set ALLOW_DEMO_SEED=1 for demo hosts, or use bootstrap-prod.",
    );
    process.exit(1);
  }

  const org = await prisma.organization.upsert({
    where: { slug: "cars-compound" },
    update: {},
    create: { name: "Cars Compound", slug: "cars-compound" },
  });

  await prisma.shopSettings.upsert({
    where: { organizationId: org.id },
    update: {
      shopName: "Cars Compound",
      portalCredit: "Portal by Arrowhead",
    },
    create: {
      organizationId: org.id,
      shopName: "Cars Compound",
      portalCredit: "Portal by Arrowhead",
      supportEmail: "service@carscompound.local",
      supportPhone: "+15555550100",
      reportFooter:
        "AI assessment is advisory only. Final estimate confirmed after physical inspection at Cars Compound.",
    },
  });

  const { DEFAULT_PRICE_BAND_SEED } = await import("@cc/domain");
  for (const band of DEFAULT_PRICE_BAND_SEED) {
    await prisma.repairPriceBand.upsert({
      where: {
        organizationId_partKey_severity: {
          organizationId: org.id,
          partKey: band.partKey,
          severity: band.severity,
        },
      },
      update: {
        partLabel: band.partLabel,
        costMin: band.costMin,
        costMax: band.costMax,
        durationDaysMin: band.durationDaysMin,
        durationDaysMax: band.durationDaysMax,
        complexity: band.complexity,
        active: true,
      },
      create: {
        organizationId: org.id,
        ...band,
        currency: "USD",
        active: true,
      },
    });
  }

  const branch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "MAIN" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Main Shop",
      code: "MAIN",
      timezone: "America/New_York",
    },
  });

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@carscompound.local" },
    update: {},
    create: {
      email: "admin@carscompound.local",
      passwordHash,
      firstName: "Shop",
      lastName: "Admin",
      phone: "+15555550100",
      role: UserRole.ADMIN,
      organizationId: org.id,
      branchId: branch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@carscompound.local" },
    update: {},
    create: {
      email: "manager@carscompound.local",
      passwordHash,
      firstName: "Maya",
      lastName: "Manager",
      phone: "+15555550101",
      role: UserRole.MANAGER,
      organizationId: org.id,
      branchId: branch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "tech@carscompound.local" },
    update: {},
    create: {
      email: "tech@carscompound.local",
      passwordHash,
      firstName: "Theo",
      lastName: "Tech",
      phone: "+15555550102",
      role: UserRole.TECHNICIAN,
      organizationId: org.id,
      branchId: branch.id,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      email: "customer@example.com",
      passwordHash,
      firstName: "Casey",
      lastName: "Customer",
      phone: "+15555550999",
      role: UserRole.CUSTOMER,
      organizationId: org.id,
    },
  });

  const profile = await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id, notes: "Seed customer" },
  });

  let vehicle = await prisma.vehicle.findFirst({
    where: { customerId: profile.id, vin: "SEEDVIN0000000001" },
  });
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: {
        customerId: profile.id,
        make: "Honda",
        model: "Civic",
        year: 2021,
        vin: "SEEDVIN0000000001",
        registrationNumber: "CC-DEMO-1",
        mileage: 42000,
        color: "Silver",
      },
    });
  }

  const existingRepair = await prisma.repairCase.findUnique({ where: { trackingId: "CC-DEMO01" } });
  if (!existingRepair) {
    await prisma.repairCase.create({
      data: {
        trackingId: "CC-DEMO01",
        branchId: branch.id,
        customerId: profile.id,
        vehicleId: vehicle.id,
        currentStage: "BODY_REPAIR",
        progressPercent: 46,
        insuranceApplicable: false,
        damageType: "Front bumper / headlight",
        expectedCompletionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        stageEvents: {
          create: [
            { toStage: "RECEIVED", progressPercent: 0, notes: "Vehicle received" },
            {
              fromStage: "RECEIVED",
              toStage: "INSPECTION_COMPLETED",
              progressPercent: 8,
              notes: "Inspection complete",
            },
            {
              fromStage: "INSPECTION_COMPLETED",
              toStage: "PARTS_ORDERED",
              progressPercent: 25,
              notes: "OEM bumper ordered",
            },
            {
              fromStage: "PARTS_ORDERED",
              toStage: "PARTS_RECEIVED",
              progressPercent: 33,
              notes: "Parts received",
            },
            {
              fromStage: "PARTS_RECEIVED",
              toStage: "BODY_REPAIR",
              progressPercent: 46,
              notes: "Body repair in progress",
            },
          ],
        },
      },
    });
  }

  const rules = [
    { code: "OIL_CHANGE", name: "Oil Change", intervalType: "months", intervalValue: 6 },
    { code: "BRAKE_INSPECTION", name: "Brake Inspection", intervalType: "months", intervalValue: 6 },
    { code: "WHEEL_ALIGNMENT", name: "Wheel Alignment", intervalType: "kilometers", intervalValue: 10000 },
    { code: "BATTERY", name: "Battery", intervalType: "years", intervalValue: 2 },
    { code: "AIR_FILTER", name: "Air Filter", intervalType: "months", intervalValue: 12 },
    { code: "COOLANT", name: "Coolant", intervalType: "months", intervalValue: 24 },
    { code: "TRANSMISSION", name: "Transmission Service", intervalType: "months", intervalValue: 24 },
  ];

  for (const rule of rules) {
    await prisma.maintenanceRule.upsert({
      where: { code: rule.code },
      update: rule,
      create: rule,
    });
  }

  const campaign = await prisma.campaign.upsert({
    where: { code: "POST_DELIVERY_FOLLOWUP" },
    update: { active: true },
    create: {
      code: "POST_DELIVERY_FOLLOWUP",
      name: "Post-Delivery Follow-up",
      type: CampaignType.FOLLOW_UP,
      active: true,
      steps: {
        create: [
          {
            offsetDays: 0,
            channel: NotificationChannel.EMAIL,
            templateKey: "followup_day0",
            subject: "Thank you for choosing Cars Compound",
            bodyTemplate:
              "Hi {{firstName}}, thank you for choosing Cars Compound. Please let us know if everything meets your expectations.",
            sortOrder: 0,
          },
          {
            offsetDays: 3,
            channel: NotificationChannel.EMAIL,
            templateKey: "followup_day3",
            subject: "How is your vehicle performing?",
            bodyTemplate:
              "Hi {{firstName}}, how is your vehicle performing? Need any assistance?",
            sortOrder: 1,
          },
          {
            offsetDays: 7,
            channel: NotificationChannel.EMAIL,
            templateKey: "followup_day7",
            subject: "We'd love your Google Review",
            bodyTemplate:
              "Hi {{firstName}}, please leave us a Google Review: {{googleReviewUrl}}",
            sortOrder: 2,
          },
          {
            offsetDays: 30,
            channel: NotificationChannel.EMAIL,
            templateKey: "followup_day30",
            subject: "Everything still working perfectly?",
            bodyTemplate:
              "Hi {{firstName}}, everything still working perfectly? Contact us if you need any adjustments.",
            sortOrder: 3,
          },
          {
            offsetDays: 180,
            channel: NotificationChannel.EMAIL,
            templateKey: "followup_day180",
            subject: "Time for your next service?",
            bodyTemplate:
              "Hi {{firstName}}, your last service was six months ago. Book your appointment today.",
            sortOrder: 4,
          },
          {
            offsetDays: 365,
            channel: NotificationChannel.EMAIL,
            templateKey: "followup_day365",
            subject: "Annual vehicle inspection recommended",
            bodyTemplate:
              "Hi {{firstName}}, annual vehicle inspection is recommended. Schedule your inspection now.",
            sortOrder: 5,
          },
        ],
      },
    },
  });

  await prisma.campaign.upsert({
    where: { code: "SEASONAL_DETAILING" },
    update: {},
    create: {
      code: "SEASONAL_DETAILING",
      name: "Seasonal Detailing Offers",
      type: CampaignType.SEASONAL,
      active: true,
      steps: {
        create: [
          {
            offsetDays: 0,
            channel: NotificationChannel.EMAIL,
            templateKey: "seasonal_detailing",
            subject: "Special detailing offer from Cars Compound",
            bodyTemplate:
              "Hi {{firstName}}, enjoy our seasonal detailing and paint protection promotions. Book today.",
            sortOrder: 0,
          },
        ],
      },
    },
  });

  console.log("Seed complete:", {
    org: org.slug,
    branch: branch.code,
    admin: admin.email,
    campaign: campaign.code,
    // Password only printed in local/dev seeds — never seed production.
    password: "ChangeMe123!",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
