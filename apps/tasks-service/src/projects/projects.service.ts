import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { name: dto.name, description: dto.description, ownerId },
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
