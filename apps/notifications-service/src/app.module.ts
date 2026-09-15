import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
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
    RealtimeModule,
    EventsModule,
    HealthModule,
  ],
})
export class AppModule {}
