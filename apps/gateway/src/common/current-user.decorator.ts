import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export interface RequestUser {
  userId: string;
  email: string;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestUser => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user as RequestUser;
});
