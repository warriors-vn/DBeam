import type { RequestHandler } from "express";
import type { ZodTypeAny, z } from "zod";

export function validateBody<S extends ZodTypeAny>(schema: S): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body) as z.infer<S>;
    next();
  };
}

export function validateQuery<S extends ZodTypeAny>(schema: S): RequestHandler {
  return (req, _res, next) => {
    // cast to satisfy express types
    (req as unknown as { validatedQuery: unknown }).validatedQuery = schema.parse(req.query);
    next();
  };
}
