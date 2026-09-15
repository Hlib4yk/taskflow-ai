import { Module } from "@nestjs/common";
import { EmbeddingsModule } from "../embeddings/embeddings.module";
import { QdrantHealthIndicator } from "./qdrant.health";
import { QdrantService } from "./qdrant.service";
import { RagService } from "./rag.service";

@Module({
  imports: [EmbeddingsModule],
  providers: [QdrantService, RagService, QdrantHealthIndicator],
  exports: [RagService, QdrantHealthIndicator],
})
export class RagModule {}
