import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';

export interface AuthRequest extends NextApiRequest {
  user?: IUser;
}

export function authenticateToken(
  req: AuthRequest,
  res: NextApiResponse,
  next: () => void
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
    ) as { userId: string };

    req.user = { _id: decoded.userId } as IUser;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

// Higher-order function to protect API routes
export function withAuth(handler: (req: AuthRequest, res: NextApiResponse) => void) {
  return (req: AuthRequest, res: NextApiResponse) => {
    return new Promise((resolve) => {
      authenticateToken(req, res, () => resolve(handler(req, res)));
    });
  };
}

// Example protected API route usage:
/*
import { withAuth, AuthRequest } from '../middleware/auth';

export default withAuth(async function handler(req: AuthRequest, res: NextApiResponse) {
  // Access authenticated user with req.user
  // Your protected route logic here
});
*/
