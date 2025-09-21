
import type { Request, Response, NextFunction } from 'express';

export function devAuthBypass(req: Request, _res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    const key = req.header('x-dev-auth');
    if (key && key === process.env.DEV_API_KEY) {
      const org = process.env.DEV_DEFAULT_ORG_ID ?? '00000000-0000-0000-0000-000000000000';
      const uid = process.env.DEV_USER_ID ?? '00000000-0000-0000-0000-000000000001';
      // minimal user/org context used by your route guards
      (req as any).user = { id: uid, organization_id: org };   // add organization_id inside user
      (req as any).organization_id = org;                      // keep this too
    }
  }
  next();
}
