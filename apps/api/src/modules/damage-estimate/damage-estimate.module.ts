import { Module, forwardRef } from "@nestjs/common";
import { AppointmentsModule } from "../appointments/appointments.module";
import { RateLimitGuard } from "../../core/rate-limit.guard";
import {
  DamageAnalyzeAliasController,
  DamageEstimateController,
} from "./damage-estimate.controller";
import { DamageEstimateService } from "./damage-estimate.service";

@Module({
  imports: [forwardRef(() => AppointmentsModule)],
  controllers: [DamageEstimateController, DamageAnalyzeAliasController],
  providers: [DamageEstimateService, RateLimitGuard],
  exports: [DamageEstimateService],
})
export class DamageEstimateModule {}
