import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { withErrorHandler } from '../../../utils/adminErrorHandler';
import { validateRequestAndSendError } from '../../../utils/adminValidation';
import { ActivityType, ActivitySubject, logModelActivity, ExtendedRequest } from '../../../utils/adminActivity';
import { sendSuccess, sendError } from '../../../utils/adminResponse';
import User from '../../../models/User';
import dbConnect from '../../../lib/dbConnect';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 'METHOD_NOT_ALLOWED', null, 405);
  }

  // Validate request body
  const validation = validateRequestAndSendError(
    req,
    res,
    [
      {
        key: 'email',
        type: 'string',
        required: true,
        pattern: /^\S+@\S+\.\S+$/,
      },
      {
        key: 'password',
        type: 'string',
        required: true,
        minLength: 8,
      },
    ],
    { source: 'body' }
  );

  if (validation) {
    return validation;
  }

  await dbConnect();

  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid credentials', 'AUTH_ERROR', null, 401);
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return sendError(res, 'Account is blocked', 'AUTH_ERROR', null, 403);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 'AUTH_ERROR', null, 401);
    }

    // Create session data (exclude password)
    const userWithoutPassword = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Create extended request for activity logging
    const extendedReq: ExtendedRequest = Object.assign(req, {
      user: userWithoutPassword
    });

    // Log successful login
    await logModelActivity({
      req: extendedReq,
      action: ActivityType.USER_LOGIN,
      subject: ActivitySubject.USER,
      itemName: user.name,
      details: `User logged in successfully`,
    });

    return sendSuccess(res, userWithoutPassword, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'An error occurred during login', 'SERVER_ERROR', error, 500);
  }
}

export default withErrorHandler(handler, 'login', 'User', 'Error during login');
