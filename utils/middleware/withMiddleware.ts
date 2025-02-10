import { NextApiRequest, NextApiResponse } from 'next';
import { AuthRequest } from '../../types/auth';

export type MiddlewareHandler<T = NextApiRequest> = (
  req: T,
  res: NextApiResponse
) => Promise<void | NextApiResponse>;

export type AuthMiddlewareHandler = MiddlewareHandler<AuthRequest>;

export function withMiddleware<T = NextApiRequest>(handler: MiddlewareHandler<T>) {
  return async (req: T, res: NextApiResponse) => {
    try {
      return await handler(req, res);
    } catch (err) {
      const error = err as Error;
      console.error('Middleware error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
}

// Helper for auth middleware
export function withAuthMiddleware(handler: AuthMiddlewareHandler) {
  return withMiddleware<AuthRequest>(handler);
}
