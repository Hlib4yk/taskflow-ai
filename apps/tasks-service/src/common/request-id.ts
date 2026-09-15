import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Reuses the x-request-id the gateway forwards (see its own request-id
 * middleware) so a single browser request's logs can be grepped across
 * every service it touches.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["x-request-id"];
  const id = (Array.isArray(header) ? header[0] : header) || randomUUID();
  req.headers["x-request-id"] = id;
  res.setHeader("x-request-id", id);
  next();
}
