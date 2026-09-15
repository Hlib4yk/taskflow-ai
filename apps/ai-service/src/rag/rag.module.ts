import { Module } from "@nestjs/common";
import { EmbeddingsModule } from "../embeddings/embeddings.module";
import { QdrantService } from "./qdrant.service";
import { RagService } from "./rag.service";

@Module({
  imports: [EmbeddingsModule],
  providers: [QdrantService, RagService],
  exports: [RagService],
})
export class RagModule {}
