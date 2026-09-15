import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { RagModule } from "../rag/rag.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [TerminusModule, RagModule],
  controllers: [HealthController],
})
export class HealthModule {}
