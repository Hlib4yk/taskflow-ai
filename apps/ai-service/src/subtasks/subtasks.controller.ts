import { Body, Controller, Post } from "@nestjs/common";
import { EVENT_PATTERNS, generateSubtasksSchema, type AiSuggestionReadyEvent, type GenerateSubtasksInput } from "@taskflow/types";
import { CurrentUserId } from "../common/current-user.decorator";
import { EventsPublisher } from "../events/events.publisher";
import { LlmService } from "../llm/llm.service";
import { RagService } from "../rag/rag.service";

@Controller("subtasks")
export class SubtasksController {
  constructor(
    private readonly rag: RagService,
    private readonly llm: LlmService,
    private readonly events: EventsPublisher,
  ) {}

  @Post("generate")
  async generate(@CurrentUserId() userId: string, @Body() body: GenerateSubtasksInput) {
    const { projectId, taskId, goal } = generateSubtasksSchema.parse(body);
    const context = await this.rag.retrieve(projectId, goal);
    const suggestions = await this.llm.generateSubtasks(goal, context);

    this.events.publish<AiSuggestionReadyEvent>(EVENT_PATTERNS.AI_SUGGESTION_READY, {
      projectId,
      taskId,
      userId,
      summary: `AI suggested ${suggestions.length} subtask(s) for "${goal}"`,
    });

    return { suggestions };
  }
}
