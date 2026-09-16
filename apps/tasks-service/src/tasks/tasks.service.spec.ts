import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EVENT_PATTERNS } from "@taskflow/types";
import { TasksService } from "./tasks.service";
import { EventsPublisher } from "../events/events.publisher";
import { PrismaService } from "../prisma/prisma.service";

describe("TasksService", () => {
  let service: TasksService;
  let prisma: {
    task: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let events: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      task: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
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

  describe("create", () => {
    it("appends the task at the end of the column and publishes task.created", async () => {
      prisma.task.findFirst.mockResolvedValue({ order: 2 });
      prisma.task.create.mockResolvedValue({
        id: "t1",
        title: "Ship it",
        description: null,
        projectId: "p1",
        columnId: "col1",
        order: 3,
      });

      const result = await service.create("u1", {
        title: "Ship it",
        projectId: "p1",
        columnId: "col1",
      });

      expect(result.id).toBe("t1");
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ columnId: "col1", order: 3 }),
      });
      expect(events.publish).toHaveBeenCalledWith(EVENT_PATTERNS.TASK_CREATED, {
        taskId: "t1",
        projectId: "p1",
        title: "Ship it",
        description: null,
        actorId: "u1",
      });
    });

    it("starts a task at order 0 in an empty column", async () => {
      prisma.task.findFirst.mockResolvedValue(null);
      prisma.task.create.mockResolvedValue({ id: "t1", projectId: "p1", columnId: "col1", order: 0 });

      await service.create("u1", { title: "First", projectId: "p1", columnId: "col1" });

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 0 }),
      });
    });
  });

  it("lists tasks for a project ordered by column then position", async () => {
    await service.findAllForProject("p1");

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { projectId: "p1" },
      orderBy: [{ columnId: "asc" }, { order: "asc" }],
    });
  });

  it("throws NotFoundException when the task does not exist", async () => {
    prisma.task.findUnique.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("moves a task to another column and publishes task.updated", async () => {
    prisma.task.update.mockResolvedValue({ id: "t1", projectId: "p1", columnId: "col2" });

    const result = await service.update("u1", "t1", { columnId: "col2", order: 0.5 });

    expect(result.columnId).toBe("col2");
    expect(events.publish).toHaveBeenCalledWith(EVENT_PATTERNS.TASK_UPDATED, {
      taskId: "t1",
      projectId: "p1",
      columnId: "col2",
      actorId: "u1",
    });
  });
});
