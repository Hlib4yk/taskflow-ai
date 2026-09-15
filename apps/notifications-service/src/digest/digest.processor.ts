import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { DigestService } from "./digest.service";

@Processor("digest")
export class DigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestProcessor.name);

  constructor(
    private readonly digest: DigestService,
    private readonly realtime: RealtimeGateway,
  ) {
    super();
  }

  async process(_job: Job): Promise<{ projectsNotified: number }> {
    const projectIds = await this.digest.activeProjectIds();
    let projectsNotified = 0;

    for (const projectId of projectIds) {
      const counts = await this.digest.drain(projectId);
      const total = Object.values(counts).reduce((sum, n) => sum + Number(n), 0);
      if (total === 0) continue;

      this.realtime.emitToProject(projectId, "digest.ready", {
        projectId,
        counts,
        generatedAt: new Date().toISOString(),
      });
      projectsNotified += 1;
    }

    this.logger.log(`Digest tick: ${projectsNotified} project(s) notified`);
    return { projectsNotified };
  }
}
