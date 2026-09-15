import { Module } from "@nestjs/common";
import { LlmModule } from "../llm/llm.module";
import { RagModule } from "../rag/rag.module";
import { ChatController } from "./chat.controller";

@Module({
  imports: [RagModule, LlmModule],
  controllers: [ChatController],
})
export class ChatModule {}
