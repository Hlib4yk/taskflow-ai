import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ProjectsService } from "./projects.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ProjectsService", () => {
  let service: ProjectsService;
  let prisma: {
    $transaction: jest.Mock;
    project: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
    column: { createMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      // The service runs everything through an interactive transaction —
      // handing the callback the same mock object back is enough to
      // verify both calls it makes inside.
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
      project: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      column: { createMany: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [ProjectsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ProjectsService);
  });

  it("creates a project owned by the caller", async () => {
    prisma.project.create.mockResolvedValue({ id: "p1", name: "Launch", ownerId: "u1" });

    const result = await service.create("u1", { name: "Launch" });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: { name: "Launch", description: undefined, ownerId: "u1" },
    });
    expect(result).toEqual({ id: "p1", name: "Launch", ownerId: "u1" });
  });

  it("seeds a fresh project with the default To Do / In Progress / Done columns", async () => {
    prisma.project.create.mockResolvedValue({ id: "p1", name: "Launch", ownerId: "u1" });

    await service.create("u1", { name: "Launch" });

    expect(prisma.column.createMany).toHaveBeenCalledWith({
      data: [
        { name: "To Do", order: 0, projectId: "p1" },
        { name: "In Progress", order: 1, projectId: "p1" },
        { name: "Done", order: 2, projectId: "p1" },
      ],
    });
  });

  it("lists only the owner's projects, newest first", async () => {
    await service.findAllForOwner("u1");

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { ownerId: "u1" },
      orderBy: { createdAt: "desc" },
    });
  });

  describe("findOneForOwner", () => {
    it("returns the project when the caller owns it", async () => {
      prisma.project.findUnique.mockResolvedValue({ id: "p1", ownerId: "u1" });

      await expect(service.findOneForOwner("u1", "p1")).resolves.toEqual({ id: "p1", ownerId: "u1" });
    });

    it("throws NotFoundException when the project does not exist", async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.findOneForOwner("u1", "missing")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException when another user owns it", async () => {
      prisma.project.findUnique.mockResolvedValue({ id: "p1", ownerId: "someone-else" });

      await expect(service.findOneForOwner("u1", "p1")).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
