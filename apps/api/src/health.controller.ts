import { Controller, Get } from "@nestjs/common";
import { Public } from "./modules/auth/public.decorator";

@Controller("health")
export class HealthController {
  @Public()
  @Get()
  health() {
    return { ok: true, service: "cars-compound-api", ts: new Date().toISOString() };
  }
}
