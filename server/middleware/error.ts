
import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const payload = {
    message: err?.message || "Internal server error",
    code: err?.code,
    detail: err?.detail,
    table: err?.table,
    column: err?.column,
    stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
  };
  console.error("API Error:", payload);
  res.status(500).json({ error: "Internal server error", details: payload });
}
