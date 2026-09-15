import { Controller } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import {
  EVENT_PATTERNS,
  type AiSuggestionReadyEvent,
  type CommentCreatedEvent,
  type TaskCreatedEvent,
  type TaskUpdatedEvent,
} from "@taskflow/types";
import { DigestService } from "../digest/digest.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

/**
 * Bridges the RabbitMQ event bus (its own "notifications_service_events"
 * queue) to connected browser clients over WebSocket — this is what turns
 * an async domain event into a live UI update. Also feeds DigestService so
 * the periodic digest job (see ../digest) has something to summarize.
 */
@Controller()
export class EventsController {
  constructor(
    private readonly realtime: RealtimeGateway,
    private readonly digest: DigestService,
  ) {}

  @EventPattern(EVENT_PATTERNS.TASK_CREATED)
  onTaskCreated(@Payload() payload: TaskCreatedEvent) {
    this.realtime.emitToProject(payload.projectId, "task.created", payload);
    void this.digest.record(payload.projectId, "task.created");
  }

  @EventPattern(EVENT_PATTERNS.TASK_UPDATED)
  onTaskUpdated(@Payload() payload: TaskUpdatedEvent) {
    this.realtime.emitToProject(payload.projectId, "task.updated", payload);
    void this.digest.record(payload.projectId, "task.updated");
  }

  @EventPattern(EVENT_PATTERNS.COMMENT_CREATED)
  onCommentCreated(@Payload() payload: CommentCreatedEvent) {
    this.realtime.emitToProject(payload.projectId, "comment.created", payload);
    void this.digest.record(payload.projectId, "comment.created");
  }

  @EventPattern(EVENT_PATTERNS.AI_SUGGESTION_READY)
  onAiSuggestionReady(@Payload() payload: AiSuggestionReadyEvent) {
    this.realtime.emitToUser(payload.userId, "ai.suggestion.ready", payload);
  }
}
