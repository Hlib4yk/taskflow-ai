import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";

@Module({
  imports: [EventsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
