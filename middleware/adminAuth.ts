import { NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { AuthRequest, ApiUser, UserRole } from '../types/auth';
import { withAuthMiddleware } from '../utils/middleware/withMiddleware';
import { sendUnauthorized } from '../utils/adminResponse';

function createUserFromToken(token: any): ApiUser {
  return {
    id: token.id as string,
    email: token.email as string,
    name: token.name as string,
    role: token.role as UserRole,
    isBlocked: token.isBlocked || false,
    createdAt: token.createdAt ? new Date(token.createdAt) : new Date(),
    updatedAt: token.updatedAt ? new Date(token.updatedAt) : new Date(),
  };
}

export function withAdminAuth(handler: (req: AuthRequest, res: NextApiResponse) => Promise<any>) {
  return withAuthMiddleware(async (req: AuthRequest, res: NextApiResponse) => {
    try {
      const token = await getToken({ req });

      if (!token) {
        return sendUnauthorized(res, 'Not authenticated');
      }

      if (token.role !== 'admin') {
        return sendUnauthorized(res, 'Not authorized - Admin access required');
      }

      if (token.isBlocked) {
        return sendUnauthorized(res, 'Account is blocked');
      }

      // Add user info to request
      req.user = createUserFromToken(token);

      return handler(req, res);
    } catch (err) {
      const error = err as Error;
      console.error('Auth middleware error:', error);
      return sendUnauthorized(res, 'Authentication error');
    }
  });
}

// Regular auth middleware (for non-admin protected routes)
export function withAuth(handler: (req: AuthRequest, res: NextApiResponse) => Promise<any>) {
  return withAuthMiddleware(async (req: AuthRequest, res: NextApiResponse) => {
    try {
      const token = await getToken({ req });

      if (!token) {
        return sendUnauthorized(res, 'Not authenticated');
      }

      if (token.isBlocked) {
        return sendUnauthorized(res, 'Account is blocked');
      }

      // Add user info to request
      req.user = createUserFromToken(token);

      return handler(req, res);
    } catch (err) {
      const error = err as Error;
      console.error('Auth middleware error:', error);
      return sendUnauthorized(res, 'Authentication error');
    }
  });
}
