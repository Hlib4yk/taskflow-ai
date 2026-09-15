import { HttpService } from "@nestjs/axios";
import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
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
        headers: { "x-user-id": user.userId },
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
  async generateSubtasks(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    const response = await firstValueFrom(
      this.http.post(`${this.baseUrl}/subtasks/generate`, body, {
        headers: { "x-user-id": user.userId },
      }),
    );
    return response.data;
  }
}
