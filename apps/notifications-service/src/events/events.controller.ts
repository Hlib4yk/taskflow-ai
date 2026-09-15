import { Controller } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import {
  EVENT_PATTERNS,
  type AiSuggestionReadyEvent,
  type CommentCreatedEvent,
  type TaskCreatedEvent,
  type TaskUpdatedEvent,
} from "@taskflow/types";
import { RealtimeGateway } from "../realtime/realtime.gateway";

/**
 * Bridges the RabbitMQ event bus (its own "notifications_service_events"
 * queue) to connected browser clients over WebSocket — this is what turns
 * an async domain event into a live UI update.
 */
@Controller()
export class EventsController {
  constructor(private readonly realtime: RealtimeGateway) {}

  @EventPattern(EVENT_PATTERNS.TASK_CREATED)
  onTaskCreated(@Payload() payload: TaskCreatedEvent) {
    this.realtime.emitToProject(payload.projectId, "task.created", payload);
  }

  @EventPattern(EVENT_PATTERNS.TASK_UPDATED)
  onTaskUpdated(@Payload() payload: TaskUpdatedEvent) {
    this.realtime.emitToProject(payload.projectId, "task.updated", payload);
  }

  @EventPattern(EVENT_PATTERNS.COMMENT_CREATED)
  onCommentCreated(@Payload() payload: CommentCreatedEvent) {
    this.realtime.emitToProject(payload.projectId, "comment.created", payload);
  }

  @EventPattern(EVENT_PATTERNS.AI_SUGGESTION_READY)
  onAiSuggestionReady(@Payload() payload: AiSuggestionReadyEvent) {
    this.realtime.emitToUser(payload.userId, "ai.suggestion.ready", payload);
  }
}
