import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest, toUserResponse, LeanUser } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';
import { logUserActivity } from '../../../../utils/logActivity';
import mongoose from 'mongoose';

async function handler(req: AuthRequest, res: NextApiResponse) {
  const {
    query: { id },
    method,
  } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const user = (await User.findById(id)
          .select('-password')
          .lean()) as unknown as {
            _id: mongoose.Types.ObjectId;
            name: string;
            email: string;
            role: 'user' | 'admin';
            isBlocked?: boolean;
            createdAt: Date;
            updatedAt: Date;
          };

        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Convert to frontend user type
        const formattedUser = toUserResponse({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role as 'user' | 'admin',
          isBlocked: user.isBlocked,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        } as LeanUser);

        res.status(200).json(formattedUser);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
      }
      break;

    case 'PUT':
      try {
        // Don't allow role changes through this endpoint
        if (req.body.role) {
          delete req.body.role;
        }

        // Check if target user is admin
        const targetUser = await User.findById(id).select('role').lean();
        if (!targetUser || !('role' in targetUser)) {
          return res.status(404).json({ message: 'User not found' });
        }
        if (!targetUser) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser.role === 'admin' && req.user?._id.toString() !== id) {
          return res.status(403).json({ message: 'Cannot modify other admin users' });
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
          id,
          { $set: req.body },
          { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
          return res.status(404).json({ message: 'User not found' });
        }

        await logUserActivity(
          'updated',
          updatedUser.name,
          `User details updated by ${req.user?.name}`,
          req.user?._id.toString()
        );

        res.status(200).json(toUserResponse(updatedUser));
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
      }
      break;

    case 'DELETE':
      try {
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
          return res.status(404).json({ message: 'User not found' });
        }

        await logUserActivity(
          'deleted',
          deletedUser.name,
          `User deleted by ${req.user?.name}`,
          req.user?._id.toString()
        );

        res.status(200).json({ message: 'User deleted successfully' });
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
      }
      break;

    case 'PATCH':
      try {
        const { operation } = req.body;

        if (!operation) {
          return res.status(400).json({ message: 'Operation not specified' });
        }

        let updatedUser;
        switch (operation) {
          case 'toggle-block':
            updatedUser = await User.findByIdAndUpdate(
              id,
              [{ $set: { isBlocked: { $not: '$isBlocked' } } }],
              { new: true }
            ).select('-password');

            if (!updatedUser) {
              return res.status(404).json({ message: 'User not found' });
            }

            await logUserActivity(
              updatedUser.isBlocked ? 'blocked' : 'unblocked',
              updatedUser.name,
              `User ${updatedUser.isBlocked ? 'blocked' : 'unblocked'} by ${req.user?.name}`,
              req.user?._id.toString()
            );

            return res.status(200).json(toUserResponse(updatedUser));

          case 'reset-password':
            // Generate a temporary password
            const tempPassword = Math.random().toString(36).slice(-8);
            
            updatedUser = await User.findById(id);
            if (!updatedUser) {
              return res.status(404).json({ message: 'User not found' });
            }

            updatedUser.password = tempPassword;
            await updatedUser.save();

            await logUserActivity(
              'reset-password',
              updatedUser.name,
              `Password reset by ${req.user?.name}`,
              req.user?._id.toString()
            );

            // In production, send this via email instead
            return res.status(200).json({
              message: 'Password reset successfully',
              temporaryPassword: tempPassword,
            });

          default:
            return res.status(400).json({ message: 'Invalid operation' });
        }
      } catch (error) {
        console.error('Error performing user operation:', error);
        res.status(500).json({ message: 'Error performing user operation' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default withAdminAuth(handler);
