import type { Request, Response, NextFunction } from 'express';
import { logger, shortRid } from '../lib/log.js';

const IGNORE = (process.env.HTTP_LOG_IGNORE ?? '').split(',').map(s => s.trim()).filter(Boolean);
const SAMPLE = Math.max(0, Math.min(1, Number(process.env.LOG_SAMPLE_RATE ?? '0.02')));
const DBG_HDR = process.env.DEBUG_HEADER ?? 'x-debug';

function shouldIgnore(path: string) {
  if (!IGNORE.length) return false;
  for (const pref of IGNORE) {
    if (!pref) continue;
    if (pref.endsWith('*')) {
      const base = pref.slice(0, -1);
      if (path.startsWith(base)) return true;
    } else if (path === pref) return true;
  }
  return false;
}

export function requestLog(req: Request, res: Response, next: NextFunction) {
  const rid = shortRid();
  (res as any).locals = { ...(res as any).locals, rid };
  res.setHeader('X-Request-Id', rid);

  // mark debug depth per request
  const forced = (req.headers[DBG_HDR] === '1') || (req.query?.debug === '1');
  const sampled = Math.random() < SAMPLE;
  (req as any)._debug = !!(forced || sampled);

  const start = performance.now();
  const path  = req.originalUrl || req.url;

  if (shouldIgnore(path)) return next();

  res.on('finish', () => {
    const ms = Math.round(performance.now() - start);
    const line = `${req.method} ${res.statusCode} ${ms}ms ${path}`;
    if (res.statusCode >= 500) {
      logger.error({ rid, method: req.method, path, status: res.statusCode, ms }, line);
    } else if (res.statusCode >= 400) {
      logger.warn({ rid, method: req.method, path, status: res.statusCode, ms }, line);
    } else {
      logger.info({ rid, method: req.method, path, status: res.statusCode, ms }, line);
    }
  });

  next();
}

// helper for deep debug inside handlers
export function reqDebug(req: Request, data: any, title = 'debug') {
  if ((req as any)._debug) {
    const rid = (res as any)?.locals?.rid ?? 'no-rid';
    logger.debug({ rid, ...data }, title);
  }
}