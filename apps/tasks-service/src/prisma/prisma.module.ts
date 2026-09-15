import { Global, Module } from "@nestjs/common";
import { DatabaseHealthIndicator } from "./prisma.health";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, DatabaseHealthIndicator],
  exports: [PrismaService, DatabaseHealthIndicator],
})
export class PrismaModule {}
