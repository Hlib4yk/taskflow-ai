import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { BullBoardModule } from "@bull-board/nestjs";
import { HttpModule } from "@nestjs/axios";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { RagModule } from "../rag/rag.module";
import { ReindexController } from "./reindex.controller";
import { ReindexProcessor } from "./reindex.processor";
import { TasksClientService } from "./tasks-client.service";

@Module({
  imports: [
    HttpModule,
    RagModule,
    BullModule.registerQueue({ name: "reindex" }),
    BullBoardModule.forFeature({ name: "reindex", adapter: BullMQAdapter }),
  ],
  controllers: [ReindexController],
  providers: [TasksClientService, ReindexProcessor],
})
export class ReindexModule {}
