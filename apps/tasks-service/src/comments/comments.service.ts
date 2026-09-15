import { Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_PATTERNS } from "@taskflow/types";
import type { CommentCreatedEvent } from "@taskflow/types";
import { EventsPublisher } from "../events/events.publisher";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsPublisher,
  ) {}

  async create(authorId: string, dto: CreateCommentDto) {
    const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException("Task not found");

    const comment = await this.prisma.comment.create({
      data: { body: dto.body, taskId: dto.taskId, authorId },
    });

    this.events.publish<CommentCreatedEvent>(EVENT_PATTERNS.COMMENT_CREATED, {
      commentId: comment.id,
      taskId: task.id,
      projectId: task.projectId,
      body: comment.body,
      actorId: authorId,
    });

    return comment;
  }

  findAllForTask(taskId: string) {
    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });
  }
}
