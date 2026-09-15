import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

/**
 * ai-service is only reachable from the gateway on the internal network —
 * the gateway already verified the JWT and forwards the caller's id via
 * this header, so downstream services trust it instead of re-validating.
 */
export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const userId = request.headers["x-user-id"];
  if (!userId || Array.isArray(userId)) {
    throw new UnauthorizedException("Missing x-user-id header");
  }
  return userId;
});
