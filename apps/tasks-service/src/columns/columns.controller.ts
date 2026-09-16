import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ColumnsService } from "./columns.service";
import { CreateColumnDto } from "./dto/create-column.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";

@Controller("columns")
export class ColumnsController {
  constructor(private readonly columns: ColumnsService) {}

  @Post()
  create(@Body() dto: CreateColumnDto) {
    return this.columns.create(dto);
  }

  @Get()
  findAll(@Query("projectId", ParseUUIDPipe) projectId: string) {
    return this.columns.findAllForProject(projectId);
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateColumnDto) {
    return this.columns.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.columns.remove(id);
  }
}
