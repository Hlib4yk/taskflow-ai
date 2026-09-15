import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { EventsController } from "./events.controller";

@Module({
  imports: [RealtimeModule],
  controllers: [EventsController],
})
export class EventsModule {}
