import { Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { QdrantService } from "./qdrant.service";

@Injectable()
export class QdrantHealthIndicator extends HealthIndicator {
  constructor(private readonly qdrant: QdrantService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.qdrant.client.getCollections();
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        "Qdrant check failed",
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
