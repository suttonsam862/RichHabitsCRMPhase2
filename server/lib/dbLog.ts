import type { Request } from 'express';
import { logger } from './log.js';

export function logSbError(req: Request, ctx: string, err: any) {
  const rid = (req as any)?.res?.locals?.rid || (req as any)?.locals?.rid;
  const code = err?.code ?? err?.status ?? 'SB_ERR';
  logger.error({ rid, ctx, code, message: err?.message, details: err }, '🔴 Supabase error');
}