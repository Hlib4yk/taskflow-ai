import type { NextFunction, Request, Response } from "express";

/**
 * Minimal HTTP Basic Auth gate for the Bull Board admin UI — good enough to
 * keep it off the open internet for a demo; swap for real SSO/RBAC before
 * this ever sees production traffic.
 */
export function bullBoardAuth(user: string, password: string) {
  const expected = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization === expected) {
      next();
      return;
    }
    res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
    res.status(401).send("Authentication required");
  };
}
