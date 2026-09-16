import { Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_PATTERNS } from "@taskflow/types";
import type { TaskCreatedEvent, TaskUpdatedEvent } from "@taskflow/types";
import { EventsPublisher } from "../events/events.publisher";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsPublisher,
  ) {}

  async create(actorId: string, dto: CreateTaskDto) {
    const last = await this.prisma.task.findFirst({
      where: { columnId: dto.columnId },
      orderBy: { order: "desc" },
    });

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        projectId: dto.projectId,
        columnId: dto.columnId,
        order: (last?.order ?? -1) + 1,
      },
    });

    this.events.publish<TaskCreatedEvent>(EVENT_PATTERNS.TASK_CREATED, {
      taskId: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      actorId,
    });

    return task;
  }

  findAllForProject(projectId: string) {
    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: [{ columnId: "asc" }, { order: "asc" }],
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  /** Also how a task moves between columns — the frontend's drag-and-drop just PATCHes columnId/order. */
  async update(actorId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.update({ where: { id }, data: dto });

    this.events.publish<TaskUpdatedEvent>(EVENT_PATTERNS.TASK_UPDATED, {
      taskId: task.id,
      projectId: task.projectId,
      columnId: task.columnId,
      actorId,
    });

    return task;
  }
}
