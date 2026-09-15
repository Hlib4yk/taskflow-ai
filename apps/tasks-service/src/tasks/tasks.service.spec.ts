import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EVENT_PATTERNS, TaskStatus } from "@taskflow/types";
import { TasksService } from "./tasks.service";
import { EventsPublisher } from "../events/events.publisher";
import { PrismaService } from "../prisma/prisma.service";

describe("TasksService", () => {
  let service: TasksService;
  let prisma: {
    task: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let events: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      task: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    events = { publish: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsPublisher, useValue: events },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  it("creates a task and publishes task.created", async () => {
    prisma.task.create.mockResolvedValue({
      id: "t1",
      title: "Ship it",
      description: null,
      projectId: "p1",
    });

    const result = await service.create("u1", { title: "Ship it", projectId: "p1" });

    expect(result.id).toBe("t1");
    expect(events.publish).toHaveBeenCalledWith(EVENT_PATTERNS.TASK_CREATED, {
      taskId: "t1",
      projectId: "p1",
      title: "Ship it",
      description: null,
      actorId: "u1",
    });
  });

  it("lists tasks for a project", async () => {
    await service.findAllForProject("p1");

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { projectId: "p1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("throws NotFoundException when the task does not exist", async () => {
    prisma.task.findUnique.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updates a task and publishes task.updated", async () => {
    prisma.task.update.mockResolvedValue({ id: "t1", projectId: "p1", status: TaskStatus.DONE });

    const result = await service.update("u1", "t1", { status: TaskStatus.DONE });

    expect(result.status).toBe(TaskStatus.DONE);
    expect(events.publish).toHaveBeenCalledWith(EVENT_PATTERNS.TASK_UPDATED, {
      taskId: "t1",
      projectId: "p1",
      status: TaskStatus.DONE,
      actorId: "u1",
    });
  });
});
