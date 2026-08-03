import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { loadEnv } from "@cc/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthPasswordService } from "./auth-password.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";
import { RateLimitGuard } from "../../core/rate-limit.guard";

@Module({
  imports: [
    forwardRef(() => NotificationsModule),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const env = loadEnv();
        return {
          secret: env.JWT_SECRET,
          signOptions: { expiresIn: env.JWT_EXPIRES_IN as `${number}d` },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthPasswordService, JwtAuthGuard, RolesGuard, RateLimitGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
