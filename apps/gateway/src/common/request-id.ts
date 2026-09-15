import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Reuses an inbound x-request-id (set by an upstream caller, or by this same
 * middleware on another service once the gateway forwards it) so a single
 * browser request's logs can be grepped across every service it touches.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["x-request-id"];
  const id = (Array.isArray(header) ? header[0] : header) || randomUUID();
  req.headers["x-request-id"] = id;
  res.setHeader("x-request-id", id);
  next();
}
