/**
 * Async handler middleware for Express routes
 * Automatically catches async errors and passes to next()
 */

import { Request, Response, NextFunction } from 'express';

export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}