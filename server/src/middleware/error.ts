import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "ValidationError", issues: err.issues });
    return;
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error("[bridge]", message);
  res.status(500).json({ error: "BridgeError", message });
};
