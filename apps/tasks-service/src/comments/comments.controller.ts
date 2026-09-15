import { Body, Controller, Get, Post, Query, ParseUUIDPipe } from "@nestjs/common";
import { CurrentUserId } from "../common/current-user.decorator";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Controller("comments")
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post()
  create(@CurrentUserId() authorId: string, @Body() dto: CreateCommentDto) {
    return this.comments.create(authorId, dto);
  }

  @Get()
  findAll(@Query("taskId", ParseUUIDPipe) taskId: string) {
    return this.comments.findAllForTask(taskId);
  }
}
