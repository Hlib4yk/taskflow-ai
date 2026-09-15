import { Injectable, Logger } from "@nestjs/common";
import type { RagSourceChunk } from "@taskflow/types";
import { v5 as uuidv5 } from "uuid";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { QdrantService, RagPoint } from "./qdrant.service";

// Fixed namespace so a given (sourceType, sourceId) always maps to the same
// Qdrant point id — re-indexing an updated task/comment overwrites in place.
const POINT_NAMESPACE = "3f1a9e2e-6f0a-4a3a-9a0a-7a9f1a2b3c4d";

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly qdrant: QdrantService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async indexDocument(doc: Omit<RagPoint, "id">) {
    const id = uuidv5(`${doc.sourceType}:${doc.sourceId}`, POINT_NAMESPACE);
    try {
      await this.qdrant.upsert({ ...doc, id });
    } catch (err) {
      this.logger.error(`Failed to index ${doc.sourceType} ${doc.sourceId}`, err as Error);
    }
  }

  async retrieve(projectId: string, query: string, topK = 5): Promise<RagSourceChunk[]> {
    const queryVector = await this.embeddings.embed(query);
    const results = await this.qdrant.search(projectId, queryVector, topK);

    return results.map((r) => ({
      sourceType: r.payload?.sourceType as RagSourceChunk["sourceType"],
      sourceId: r.payload?.sourceId as string,
      text: r.payload?.text as string,
      score: r.score,
    }));
  }
}
