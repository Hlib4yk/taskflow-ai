import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { DigestSchedulerService } from "./digest-scheduler.service";
import { DigestProcessor } from "./digest.processor";
import { DigestService } from "./digest.service";
import { redisClientProvider } from "./redis.provider";

@Module({
  imports: [
    RealtimeModule,
    BullModule.registerQueue({ name: "digest" }),
    BullBoardModule.forFeature({ name: "digest", adapter: BullMQAdapter }),
  ],
  providers: [redisClientProvider, DigestService, DigestProcessor, DigestSchedulerService],
  exports: [DigestService],
})
export class DigestModule {}
