import { NextApiRequest, NextApiResponse } from 'next';

export type MiddlewareHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void | NextApiResponse>;

export function withMiddleware(handler: MiddlewareHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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
