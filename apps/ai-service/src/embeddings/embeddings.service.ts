import { Injectable, Logger } from "@nestjs/common";

type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array }>;

/**
 * Runs embeddings locally via transformers.js (all-MiniLM-L6-v2, 384 dims)
 * instead of calling an external embeddings API — keeps the RAG pipeline
 * working with a single LLM API key (Anthropic, used only for generation).
 * The model is downloaded and cached on first use.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

  readonly dimensions = 384;

  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      this.logger.log("Loading local embedding model (Xenova/all-MiniLM-L6-v2)...");
      this.pipelinePromise = import("@xenova/transformers").then(({ pipeline }) =>
        pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2") as unknown as Promise<FeatureExtractionPipeline>,
      );
    }
    return this.pipelinePromise;
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }
}
