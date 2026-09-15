import { HttpService } from "@nestjs/axios";
import { All, Controller, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { firstValueFrom } from "rxjs";
import { CurrentUser, RequestUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

/**
 * Thin reverse proxy for the domain resource routes owned by tasks-service
 * (/projects, /tasks, /comments). The gateway is the only service exposed
 * publicly; everything behind it is only reachable on the internal network.
 */
@UseGuards(JwtAuthGuard)
@Controller(["projects", "tasks", "comments"])
export class TasksProxyController {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>("TASKS_SERVICE_URL");
  }

  @All()
  @All(":path")
  async forward(@Req() req: Request, @Res() res: Response, @CurrentUser() user: RequestUser) {
    const targetPath = req.originalUrl;
    const response = await firstValueFrom(
      this.http.request({
        url: `${this.baseUrl}${targetPath}`,
        method: req.method,
        data: req.body,
        headers: { "x-user-id": user.userId },
        validateStatus: () => true,
      }),
    );

    res.status(response.status).json(response.data);
  }
}
