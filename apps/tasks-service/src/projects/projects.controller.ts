import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { CurrentUserId } from "../common/current-user.decorator";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  create(@CurrentUserId() ownerId: string, @Body() dto: CreateProjectDto) {
    return this.projects.create(ownerId, dto);
  }

  @Get()
  findAll(@CurrentUserId() ownerId: string) {
    return this.projects.findAllForOwner(ownerId);
  }

  @Get(":id")
  findOne(@CurrentUserId() ownerId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.projects.findOneForOwner(ownerId, id);
  }
}
