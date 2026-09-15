import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { ChatModule } from "./chat/chat.module";
import { HealthModule } from "./health/health.module";
import { IngestModule } from "./ingest/ingest.module";
import { RagModule } from "./rag/rag.module";
import { SubtasksModule } from "./subtasks/subtasks.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({ pinoHttp: { level: process.env.NODE_ENV === "production" ? "info" : "debug" } }),
    RagModule,
    ChatModule,
    SubtasksModule,
    IngestModule,
    HealthModule,
  ],
})
export class AppModule {}
