import { Body, Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { chatRequestSchema, type ChatRequestInput } from "@taskflow/types";
import { LlmService } from "../llm/llm.service";
import { RagService } from "../rag/rag.service";

@Controller("chat")
export class ChatController {
  constructor(
    private readonly rag: RagService,
    private readonly llm: LlmService,
  ) {}

  /**
   * Server-Sent Events stream: retrieves project context from Qdrant, then
   * streams the Claude reply token-by-token. The gateway pipes this stream
   * through to the browser unmodified.
   */
  @Post()
  async chat(@Body() body: ChatRequestInput, @Res() res: Response) {
    const { projectId, message } = chatRequestSchema.parse(body);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const context = await this.rag.retrieve(projectId, message);

    try {
      for await (const token of this.llm.streamChatReply(message, context)) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true, sources: context })}\n\n`);
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
