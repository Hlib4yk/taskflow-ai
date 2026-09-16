import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";

// Every new project starts with a Trello-style default board, same as a
// fresh Trello board — users can rename/delete/add columns from there.
const DEFAULT_COLUMNS = ["To Do", "In Progress", "Done"];

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateProjectDto) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { name: dto.name, description: dto.description, ownerId },
      });

      await tx.column.createMany({
        data: DEFAULT_COLUMNS.map((name, order) => ({ name, order, projectId: project.id })),
      });

      return project;
    });
  }

  findAllForOwner(ownerId: string) {
    return this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOneForOwner(ownerId: string, id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("Project not found");
    if (project.ownerId !== ownerId) throw new ForbiddenException();
    return project;
  }
}
