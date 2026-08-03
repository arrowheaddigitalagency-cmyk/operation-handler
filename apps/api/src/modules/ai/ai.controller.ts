import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { z } from "zod";
import { AiService } from "./ai.service";
import { Public } from "../auth/public.decorator";
import { AI_ESTIMATE_DISCLAIMER } from "@cc/domain";
import { RateLimit, RateLimitGuard } from "../../core/rate-limit.guard";

@Controller("ai")
@UseGuards(RateLimitGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Public()
  @Get("disclaimer")
  disclaimer() {
    return { disclaimer: AI_ESTIMATE_DISCLAIMER };
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post("damage-analysis")
  @UseInterceptors(FilesInterceptor("images", 8))
  analyze(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, string>,
  ) {
    const meta = z
      .object({
        guestName: z.string().min(1),
        guestEmail: z.string().email(),
        guestPhone: z.string().min(7),
        make: z.string().optional(),
        model: z.string().optional(),
        year: z.coerce.number().int().optional(),
      })
      .parse(body);
    return this.ai.submitDamageAnalysis(files ?? [], meta);
  }

  @Public()
  @RateLimit(60, 60_000)
  @Get("damage-analysis/:id")
  status(@Param("id") id: string) {
    return this.ai.getAnalysis(id);
  }

  @Public()
  @RateLimit(30, 60_000)
  @Get("reports/:reportId")
  byReport(@Param("reportId") reportId: string) {
    return this.ai.getByReportId(reportId);
  }

  @Public()
  @RateLimit(30, 60_000)
  @Get("reports/:reportId/html")
  @Header("Content-Type", "text/html; charset=utf-8")
  async reportHtml(@Param("reportId") reportId: string, @Res() res: Response) {
    const html = await this.ai.getReportHtml(reportId);
    res.send(html);
  }
}
