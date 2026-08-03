import { Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { loadEnv } from "@cc/config";
import { CampaignsService } from "./campaigns.service";
import { Public } from "../auth/public.decorator";

@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Public()
  @Post("run")
  run(@Headers("x-cron-secret") secret?: string) {
    const env = loadEnv();
    if (secret !== env.CRON_SECRET) throw new UnauthorizedException();
    return this.campaigns.runDueSteps();
  }
}
