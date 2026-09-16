import { HttpService } from "@nestjs/axios";
import { All, Controller, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { firstValueFrom } from "rxjs";
import { CurrentUser, RequestUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

/**
 * Thin reverse proxy for the domain resource routes owned by tasks-service
 * (/projects, /tasks, /comments, /columns). The gateway is the only
 * service exposed publicly; everything behind it is only reachable on the
 * internal network.
 */
@UseGuards(JwtAuthGuard)
@Controller(["projects", "tasks", "comments", "columns"])
export class TasksProxyController {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>("TASKS_SERVICE_URL");
  }

  // A single "zero or more segments" wildcard, not two stacked @All()
  // decorators — combining an array controller prefix with more than one
  // method-level path silently drops every path but the first when Nest
  // computes the combination, so `/projects/:id` (or any sub-path) never
  // actually got registered.
  @All(":path?")
  async forward(@Req() req: Request, @Res() res: Response, @CurrentUser() user: RequestUser) {
    const targetPath = req.originalUrl;
    const response = await firstValueFrom(
      this.http.request({
        url: `${this.baseUrl}${targetPath}`,
        method: req.method,
        data: req.body,
        headers: { "x-user-id": user.userId, "x-request-id": req.headers["x-request-id"] },
        validateStatus: () => true,
      }),
    );

    res.status(response.status).json(response.data);
  }
}
