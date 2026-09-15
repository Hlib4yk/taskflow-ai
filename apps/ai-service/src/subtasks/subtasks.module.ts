import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { LlmModule } from "../llm/llm.module";
import { RagModule } from "../rag/rag.module";
import { SubtasksController } from "./subtasks.controller";

@Module({
  imports: [RagModule, LlmModule, EventsModule],
  controllers: [SubtasksController],
})
export class SubtasksModule {}
