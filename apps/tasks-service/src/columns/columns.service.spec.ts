import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ColumnsService } from "./columns.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ColumnsService", () => {
  let service: ColumnsService;
  let prisma: {
    column: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    task: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      column: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      task: { count: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [ColumnsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ColumnsService);
  });

  describe("create", () => {
    it("appends the column after the last one in the project", async () => {
      prisma.column.findFirst.mockResolvedValue({ order: 2 });
      prisma.column.create.mockResolvedValue({ id: "col1", name: "Blocked", order: 3, projectId: "p1" });

      await service.create({ projectId: "p1", name: "Blocked" });

      expect(prisma.column.create).toHaveBeenCalledWith({
        data: { projectId: "p1", name: "Blocked", order: 3 },
      });
    });

    it("starts at order 0 for a project's first column", async () => {
      prisma.column.findFirst.mockResolvedValue(null);
      prisma.column.create.mockResolvedValue({ id: "col1", name: "To Do", order: 0, projectId: "p1" });

      await service.create({ projectId: "p1", name: "To Do" });

      expect(prisma.column.create).toHaveBeenCalledWith({
        data: { projectId: "p1", name: "To Do", order: 0 },
      });
    });
  });

  it("lists a project's columns ordered by position", async () => {
    await service.findAllForProject("p1");

    expect(prisma.column.findMany).toHaveBeenCalledWith({
      where: { projectId: "p1" },
      orderBy: { order: "asc" },
    });
  });

  describe("update", () => {
    it("renames an existing column", async () => {
      prisma.column.findUnique.mockResolvedValue({ id: "col1" });
      prisma.column.update.mockResolvedValue({ id: "col1", name: "Renamed" });

      await service.update("col1", { name: "Renamed" });

      expect(prisma.column.update).toHaveBeenCalledWith({ where: { id: "col1" }, data: { name: "Renamed" } });
    });

    it("throws NotFoundException for a missing column", async () => {
      prisma.column.findUnique.mockResolvedValue(null);

      await expect(service.update("missing", { name: "x" })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("remove", () => {
    it("deletes an empty column", async () => {
      prisma.column.findUnique.mockResolvedValue({ id: "col1" });
      prisma.task.count.mockResolvedValue(0);

      await service.remove("col1");

      expect(prisma.column.delete).toHaveBeenCalledWith({ where: { id: "col1" } });
    });

    it("refuses to delete a column that still has tasks", async () => {
      prisma.column.findUnique.mockResolvedValue({ id: "col1" });
      prisma.task.count.mockResolvedValue(2);

      await expect(service.remove("col1")).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.column.delete).not.toHaveBeenCalled();
    });
  });
});
