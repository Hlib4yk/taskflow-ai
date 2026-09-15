import { InjectQueue } from "@nestjs/bullmq";
import { Controller, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import type { Queue } from "bullmq";
import type { ReindexJobData } from "./reindex.processor";

@Controller("reindex")
export class ReindexController {
  constructor(@InjectQueue("reindex") private readonly queue: Queue<ReindexJobData>) {}

  @Post(":projectId")
  async enqueue(@Param("projectId", ParseUUIDPipe) projectId: string) {
    const job = await this.queue.add("reindex-project", { projectId });
    return { jobId: job.id, projectId };
  }
}
