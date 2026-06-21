import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

function assignRequestValue<T extends "body" | "query">(req: Request, key: T, value: unknown) {
  Object.defineProperty(req, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value
  });
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    assignRequestValue(req, "body", schema.parse(req.body));
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    assignRequestValue(req, "query", schema.parse(req.query) as Request["query"]);
    next();
  };
}
