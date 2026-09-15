import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CommentDto, TaskDto } from "@taskflow/types";
import { firstValueFrom } from "rxjs";

/**
 * Direct internal-network call to tasks-service (same trust boundary as the
 * RabbitMQ event consumer, bypassing the gateway) — used only for bulk
 * re-indexing, where replaying the async event stream alone can't rebuild
 * a project's full history.
 */
@Injectable()
export class TasksClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>("TASKS_SERVICE_URL");
  }

  async listTasks(projectId: string): Promise<TaskDto[]> {
    const res = await firstValueFrom(
      this.http.get<TaskDto[]>(`${this.baseUrl}/tasks`, { params: { projectId } }),
    );
    return res.data;
  }

  async listComments(taskId: string): Promise<CommentDto[]> {
    const res = await firstValueFrom(
      this.http.get<CommentDto[]>(`${this.baseUrl}/comments`, { params: { taskId } }),
    );
    return res.data;
  }
}
