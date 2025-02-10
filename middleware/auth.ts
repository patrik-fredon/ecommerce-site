import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { AuthRequest, ApiUser } from '../types/auth';
import User from '../models/User';
import dbConnect from '../lib/dbConnect';

interface JwtPayload {
  userId: string;
}

export function withAuth(handler: (req: AuthRequest, res: NextApiResponse) => Promise<any>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get token from authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      // Verify token
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }

      const { userId } = jwt.verify(token, secret) as JwtPayload;

      // Get user from database
      await dbConnect();
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Add user to request object
      (req as AuthRequest).user = user as ApiUser;

      // Call the handler
      return handler(req as AuthRequest, res);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      console.error('Auth middleware error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}
