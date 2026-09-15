import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [EventsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
