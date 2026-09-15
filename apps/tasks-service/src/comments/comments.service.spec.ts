import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EVENT_PATTERNS } from "@taskflow/types";
import { CommentsService } from "./comments.service";
import { EventsPublisher } from "../events/events.publisher";
import { PrismaService } from "../prisma/prisma.service";

describe("CommentsService", () => {
  let service: CommentsService;
  let prisma: {
    task: { findUnique: jest.Mock };
    comment: { create: jest.Mock; findMany: jest.Mock };
  };
  let events: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      task: { findUnique: jest.fn() },
      comment: { create: jest.fn(), findMany: jest.fn() },
    };
    events = { publish: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsPublisher, useValue: events },
      ],
    }).compile();

    service = module.get(CommentsService);
  });

  it("creates a comment on an existing task and publishes comment.created", async () => {
    prisma.task.findUnique.mockResolvedValue({ id: "t1", projectId: "p1" });
    prisma.comment.create.mockResolvedValue({ id: "c1", body: "Looks good", taskId: "t1" });

    const result = await service.create("u1", { body: "Looks good", taskId: "t1" });

    expect(result.id).toBe("c1");
    expect(events.publish).toHaveBeenCalledWith(EVENT_PATTERNS.COMMENT_CREATED, {
      commentId: "c1",
      taskId: "t1",
      projectId: "p1",
      body: "Looks good",
      actorId: "u1",
    });
  });

  it("throws NotFoundException when the task does not exist", async () => {
    prisma.task.findUnique.mockResolvedValue(null);

    await expect(service.create("u1", { body: "Looks good", taskId: "missing" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.comment.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("lists comments for a task oldest first", async () => {
    await service.findAllForTask("t1");

    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: { taskId: "t1" },
      orderBy: { createdAt: "asc" },
    });
  });
});
