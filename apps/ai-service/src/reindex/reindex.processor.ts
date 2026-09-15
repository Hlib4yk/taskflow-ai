import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { RagService } from "../rag/rag.service";
import { TasksClientService } from "./tasks-client.service";

export interface ReindexJobData {
  projectId: string;
}

/**
 * Bulk re-indexing is exactly the kind of work the README's own "Where to
 * go next" flagged as a background-job candidate — it fans out into one
 * embedding call per task/comment and shouldn't block an HTTP request.
 */
@Processor("reindex")
export class ReindexProcessor extends WorkerHost {
  private readonly logger = new Logger(ReindexProcessor.name);

  constructor(
    private readonly tasksClient: TasksClientService,
    private readonly rag: RagService,
  ) {
    super();
  }

  async process(job: Job<ReindexJobData>): Promise<{ tasksIndexed: number; commentsIndexed: number }> {
    const { projectId } = job.data;
    const tasks = await this.tasksClient.listTasks(projectId);

    let commentsIndexed = 0;
    for (const task of tasks) {
      await this.rag.indexDocument({
        projectId,
        sourceType: "task",
        sourceId: task.id,
        text: `Task: ${task.title}\n${task.description ?? ""}`.trim(),
      });

      const comments = await this.tasksClient.listComments(task.id);
      for (const comment of comments) {
        await this.rag.indexDocument({
          projectId,
          sourceType: "comment",
          sourceId: comment.id,
          text: comment.body,
        });
        commentsIndexed += 1;
      }
    }

    this.logger.log(`Reindexed project ${projectId}: ${tasks.length} task(s), ${commentsIndexed} comment(s)`);
    return { tasksIndexed: tasks.length, commentsIndexed };
  }
}
