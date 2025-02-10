import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest, toUserResponse, LeanUser } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';

async function handler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        // Get all users except the current admin
        const users = await User.find({})
          .select('-password')
          .sort({ createdAt: -1 })
          .lean();
        
        // Convert lean documents to frontend user type with type assertion
        const formattedUsers = users.map(user => toUserResponse({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role as 'user' | 'admin',
          isBlocked: user.isBlocked,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        } as LeanUser));
        res.status(200).json(formattedUsers);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
      }
      break;

    case 'POST':
      try {
        // Create a new user (admin function)
        const user = await User.create(req.body);
        // Convert to frontend user type
        const formattedUser = toUserResponse(user);
        res.status(201).json(formattedUser);
      } catch (error) {
        const err = error as Error;
        if ((err as any).code === 11000) {
          res.status(400).json({ message: 'Email already exists' });
        } else {
          res.status(500).json({ message: 'Error creating user' });
        }
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default withAdminAuth(handler);
