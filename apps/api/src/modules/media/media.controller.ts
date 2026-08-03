import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { existsSync, createReadStream } from "fs";
import { join } from "path";
import { Public } from "../auth/public.decorator";

@Controller("media")
export class MediaController {
  @Public()
  @Get("local/:filename")
  local(@Param("filename") filename: string, @Res() res: Response) {
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      throw new NotFoundException();
    }
    const path = join(process.cwd(), "uploads", filename);
    if (!existsSync(path)) throw new NotFoundException();
    const stream = createReadStream(path);
    stream.pipe(res);
  }
}
