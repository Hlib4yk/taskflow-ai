import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateColumnDto } from "./dto/create-column.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";

@Injectable()
export class ColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateColumnDto) {
    const last = await this.prisma.column.findFirst({
      where: { projectId: dto.projectId },
      orderBy: { order: "desc" },
    });

    return this.prisma.column.create({
      data: { projectId: dto.projectId, name: dto.name, order: (last?.order ?? -1) + 1 },
    });
  }

  findAllForProject(projectId: string) {
    return this.prisma.column.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });
  }

  async update(id: string, dto: UpdateColumnDto) {
    await this.findOneOrThrow(id);
    return this.prisma.column.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrThrow(id);

    const taskCount = await this.prisma.task.count({ where: { columnId: id } });
    if (taskCount > 0) {
      throw new ConflictException("Move or delete the tasks in this column first");
    }

    await this.prisma.column.delete({ where: { id } });
  }

  private async findOneOrThrow(id: string) {
    const column = await this.prisma.column.findUnique({ where: { id } });
    if (!column) throw new NotFoundException("Column not found");
    return column;
  }
}
