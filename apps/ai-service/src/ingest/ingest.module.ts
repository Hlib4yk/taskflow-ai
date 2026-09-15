import { Module } from "@nestjs/common";
import { RagModule } from "../rag/rag.module";
import { IngestController } from "./ingest.controller";

@Module({
  imports: [RagModule],
  controllers: [IngestController],
})
export class IngestModule {}
