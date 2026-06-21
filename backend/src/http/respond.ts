import type { Response } from "express";
import type { ZodType } from "zod";

export function respond<T>(res: Response, schema: ZodType<T>, payload: T, status = 200): void {
  const parsed = schema.parse(payload);
  res.status(status).json(parsed);
}
