import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { EmbeddingsService } from "../embeddings/embeddings.service";

export const RAG_COLLECTION = "taskflow_context";

export interface RagPoint {
  id: string;
  projectId: string;
  sourceType: "task" | "comment" | "project";
  sourceId: string;
  text: string;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  readonly client: QdrantClient;

  constructor(
    private readonly config: ConfigService,
    private readonly embeddings: EmbeddingsService,
  ) {
    this.client = new QdrantClient({ url: this.config.getOrThrow<string>("QDRANT_URL") });
  }

  async onModuleInit() {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === RAG_COLLECTION);
    if (!exists) {
      this.logger.log(`Creating Qdrant collection "${RAG_COLLECTION}"`);
      await this.client.createCollection(RAG_COLLECTION, {
        vectors: { size: this.embeddings.dimensions, distance: "Cosine" },
      });
      await this.client.createPayloadIndex(RAG_COLLECTION, {
        field_name: "projectId",
        field_schema: "keyword",
      });
    }
  }

  async upsert(point: RagPoint) {
    const vector = await this.embeddings.embed(point.text);
    await this.client.upsert(RAG_COLLECTION, {
      wait: true,
      points: [
        {
          id: point.id,
          vector,
          payload: {
            projectId: point.projectId,
            sourceType: point.sourceType,
            sourceId: point.sourceId,
            text: point.text,
          },
        },
      ],
    });
  }

  async search(projectId: string, queryVector: number[], limit = 5) {
    const result = await this.client.query(RAG_COLLECTION, {
      query: queryVector,
      limit,
      filter: { must: [{ key: "projectId", match: { value: projectId } }] },
      with_payload: true,
    });
    return result.points;
  }
}
