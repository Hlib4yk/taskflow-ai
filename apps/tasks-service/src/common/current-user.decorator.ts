import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

/**
 * tasks-service sits behind the gateway on a private network (docker/k8s
 * internal service, never exposed publicly) — the gateway already verified
 * the JWT and forwards the caller's id via this header, so downstream
 * services trust it instead of re-validating the token.
 */
export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const userId = request.headers["x-user-id"];
  if (!userId || Array.isArray(userId)) {
    throw new UnauthorizedException("Missing x-user-id header");
  }
  return userId;
});
