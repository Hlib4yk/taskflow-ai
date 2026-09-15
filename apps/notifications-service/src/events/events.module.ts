import { Module } from "@nestjs/common";
import { DigestModule } from "../digest/digest.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { EventsController } from "./events.controller";

@Module({
  imports: [RealtimeModule, DigestModule],
  controllers: [EventsController],
})
export class EventsModule {}
