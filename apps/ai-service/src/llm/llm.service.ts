import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import type { RagSourceChunk } from "@taskflow/types";

const SYSTEM_PROMPT = `You are the TaskFlow AI project assistant. Answer questions about the
user's project using only the provided context (tasks and comments). If the
context does not contain the answer, say so plainly instead of guessing.
Be concise and reference task titles when relevant.`;

function buildContextBlock(chunks: RagSourceChunk[]): string {
  if (chunks.length === 0) return "No relevant project context was found.";
  return chunks
    .map((c, i) => `[${i + 1}] (${c.sourceType}, relevance ${c.score.toFixed(2)}): ${c.text}`)
    .join("\n\n");
}

@Injectable()
export class LlmService {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({ apiKey: this.config.getOrThrow<string>("ANTHROPIC_API_KEY") });
    this.model = this.config.get<string>("LLM_MODEL") ?? "claude-sonnet-5";
  }

  /** Streams the assistant's reply token-by-token for the chat SSE endpoint. */
  async *streamChatReply(message: string, context: RagSourceChunk[]): AsyncGenerator<string> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Project context:\n${buildContextBlock(context)}\n\nQuestion: ${message}`,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }

  /** Non-streaming structured call used to turn a goal into concrete subtasks. */
  async generateSubtasks(goal: string, context: RagSourceChunk[]): Promise<string[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system:
        "Break the user's goal into 3-6 concrete, actionable subtasks given the project " +
        'context. Respond with ONLY a JSON array of short strings, e.g. ["Do X", "Do Y"].',
      messages: [
        {
          role: "user",
          content: `Project context:\n${buildContextBlock(context)}\n\nGoal: ${goal}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    try {
      const parsed: unknown = JSON.parse(textBlock.text);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [textBlock.text];
    }
  }
}
