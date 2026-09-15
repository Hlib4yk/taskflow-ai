import { ExpressAdapter } from "@bull-board/express";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import Redis from "ioredis";
import { bullBoardAuth } from "./common/bull-board-auth";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { RealtimeModule } from "./realtime/realtime.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        genReqId: (req) => req.headers["x-request-id"] as string,
      },
    }),
    PrometheusModule.register({ defaultMetrics: { enabled: true } }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: new Redis(config.getOrThrow<string>("REDIS_URL"), { maxRetriesPerRequest: null }),
      }),
      inject: [ConfigService],
    }),
    BullBoardModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        route: "/admin/queues",
        adapter: ExpressAdapter,
        middleware: bullBoardAuth(
          config.get<string>("BULL_BOARD_USER") ?? "admin",
          config.get<string>("BULL_BOARD_PASSWORD") ?? "admin",
        ),
      }),
      inject: [ConfigService],
    }),
    RealtimeModule,
    EventsModule,
    HealthModule,
  ],
})
export class AppModule {}
