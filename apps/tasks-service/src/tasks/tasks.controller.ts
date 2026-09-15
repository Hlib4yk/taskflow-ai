import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { CurrentUserId } from "../common/current-user.decorator";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@Controller("tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  create(@CurrentUserId() actorId: string, @Body() dto: CreateTaskDto) {
    return this.tasks.create(actorId, dto);
  }

  @Get()
  findAll(@Query("projectId", ParseUUIDPipe) projectId: string) {
    return this.tasks.findAllForProject(projectId);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.tasks.findOne(id);
  }

  @Patch(":id")
  update(
    @CurrentUserId() actorId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(actorId, id, dto);
  }
}
