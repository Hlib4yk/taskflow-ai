import { Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import {
  EVENT_PATTERNS,
  type CommentCreatedEvent,
  type TaskCreatedEvent,
  type TaskUpdatedEvent,
} from "@taskflow/types";
import { RagService } from "../rag/rag.service";

/**
 * RabbitMQ consumer that keeps Qdrant in sync with tasks-service: every
 * task/comment created there is embedded and indexed here so the chat
 * assistant can retrieve it later. Runs off the "ai_service_events" queue
 * declared in main.ts.
 */
@Controller()
export class IngestController {
  private readonly logger = new Logger(IngestController.name);

  constructor(private readonly rag: RagService) {}

  @EventPattern(EVENT_PATTERNS.TASK_CREATED)
  async onTaskCreated(@Payload() payload: TaskCreatedEvent) {
    this.logger.log(`Indexing task ${payload.taskId}`);
    await this.rag.indexDocument({
      projectId: payload.projectId,
      sourceType: "task",
      sourceId: payload.taskId,
      text: `Task: ${payload.title}\n${payload.description ?? ""}`.trim(),
    });
  }

  @EventPattern(EVENT_PATTERNS.TASK_UPDATED)
  async onTaskUpdated(@Payload() payload: TaskUpdatedEvent) {
    this.logger.log(`Task ${payload.taskId} moved to column ${payload.columnId}`);
    // Column moves alone don't need re-embedding (no new text), so this is
    // a no-op placeholder for future signals (e.g. re-index on title edits).
  }

  @EventPattern(EVENT_PATTERNS.COMMENT_CREATED)
  async onCommentCreated(@Payload() payload: CommentCreatedEvent) {
    this.logger.log(`Indexing comment ${payload.commentId}`);
    await this.rag.indexDocument({
      projectId: payload.projectId,
      sourceType: "comment",
      sourceId: payload.commentId,
      text: payload.body,
    });
  }
}
