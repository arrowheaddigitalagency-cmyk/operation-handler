import { Global, Module } from "@nestjs/common";
import { ENV, PrismaService, StorageService, LoggerService } from "./core.providers";

@Global()
@Module({
  providers: [ENV, PrismaService, StorageService, LoggerService],
  exports: [ENV, PrismaService, StorageService, LoggerService],
})
export class CoreModule {}
