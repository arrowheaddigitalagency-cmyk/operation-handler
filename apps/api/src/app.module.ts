import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { APP_GUARD } from "@nestjs/core";
import { CoreModule } from "./core/core.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { RepairsModule } from "./modules/repairs/repairs.module";
import { EstimatesModule } from "./modules/estimates/estimates.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { AiModule } from "./modules/ai/ai.module";
import { MediaModule } from "./modules/media/media.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { MaintenanceModule } from "./modules/maintenance/maintenance.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SupportModule } from "./modules/support/support.module";
import { SystemModule } from "./modules/system/system.module";
import { HealthController } from "./health.controller";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    CoreModule,
    AuthModule,
    CustomersModule,
    VehiclesModule,
    AppointmentsModule,
    RepairsModule,
    EstimatesModule,
    InvoicesModule,
    AiModule,
    MediaModule,
    NotificationsModule,
    MaintenanceModule,
    CampaignsModule,
    ReportsModule,
    LeadsModule,
    SettingsModule,
    SupportModule,
    SystemModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
