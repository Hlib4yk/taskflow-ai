import { HttpService } from "@nestjs/axios";
import { Body, Controller, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { firstValueFrom } from "rxjs";
import { CurrentUser, RequestUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller()
export class AiProxyController {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>("AI_SERVICE_URL");
  }

  /** Proxies the Server-Sent Events chat stream through to the browser as-is. */
  @Post("chat")
  async chat(@Req() req: Request, @Res() res: Response, @CurrentUser() user: RequestUser) {
    const upstream = await firstValueFrom(
      this.http.post(`${this.baseUrl}/chat`, req.body, {
        headers: { "x-user-id": user.userId, "x-request-id": req.headers["x-request-id"] },
        responseType: "stream",
      }),
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    upstream.data.pipe(res);
    req.on("close", () => upstream.data.destroy());
  }

  @Post("subtasks/generate")
  async generateSubtasks(@Req() req: Request, @Body() body: unknown, @CurrentUser() user: RequestUser) {
    const response = await firstValueFrom(
      this.http.post(`${this.baseUrl}/subtasks/generate`, body, {
        headers: { "x-user-id": user.userId, "x-request-id": req.headers["x-request-id"] },
      }),
    );
    return response.data;
  }

  /** Enqueues a bulk re-index of a project's tasks/comments into Qdrant (see ai-service's BullMQ "reindex" queue). */
  @Post("projects/:projectId/reindex")
  async reindex(
    @Req() req: Request,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const response = await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/reindex/${projectId}`,
        {},
        { headers: { "x-user-id": user.userId, "x-request-id": req.headers["x-request-id"] } },
      ),
    );
    return response.data;
  }
}
