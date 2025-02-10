import { NextApiResponse } from 'next';
import { withAuth } from './auth';
import { logAdminAccess, logAdminError } from '../utils/adminLogger';
import { AuthRequest } from '../types/auth';

export function withAdminAuth(handler: (req: AuthRequest, res: NextApiResponse) => Promise<any>) {
  return withAuth(async (req: AuthRequest, res: NextApiResponse) => {
    // Check if user exists and is an admin
    const user = req.user;
    if (!user || user.role !== 'admin') {
      const url = req.url || 'unknown URL';
      await logAdminAccess({
        action: 'denied',
        subject: 'Admin API',
        details: `Unauthorized access attempt to ${url}`
      });
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      await logAdminAccess({
        action: 'blocked',
        subject: 'Admin API',
        details: `Blocked admin ${user.email} attempted to access ${req.url || 'unknown URL'}`,
        adminName: user.name || 'Unknown',
        adminId: user._id?.toString() || 'unknown'
      });
      return res.status(403).json({ message: 'Account is blocked' });
    }

    // Add activity logging for sensitive operations
    const originalMethod = req.method;
    const originalUrl = req.url;

    try {
      // Execute the handler
      const result = await handler(req, res);

      // Log successful sensitive operations
      if (originalMethod && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(originalMethod)) {
        await logAdminAccess({
          action: originalMethod,
          subject: 'Admin API',
          details: `Performed ${originalMethod} on ${originalUrl || 'unknown URL'}`,
          adminName: user.name || 'Unknown',
          adminId: user._id?.toString() || 'unknown'
        });
      }

      return result;
    } catch (error) {
      // Log errors in sensitive operations
      if (originalMethod && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(originalMethod)) {
        await logAdminError({
          action: originalMethod,
          subject: 'Admin API',
          details: `Error on ${originalUrl || 'unknown URL'}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          adminName: user.name || 'Unknown',
          adminId: user._id?.toString() || 'unknown'
        });
      }
      throw error;
    }
  });
}
