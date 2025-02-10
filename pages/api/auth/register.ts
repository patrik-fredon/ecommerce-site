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
        key: 'name',
        type: 'string',
        required: true,
        minLength: 2,
      },
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
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'Email already registered', 'DUPLICATE_ERROR', null, 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user',
      isBlocked: false,
    });

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

    // Log user creation
    await logModelActivity({
      req: extendedReq,
      action: ActivityType.USER_CREATED,
      subject: ActivitySubject.USER,
      itemName: user.name,
      details: `New user registered`,
    });

    return sendSuccess(res, userWithoutPassword, 'Registration successful', undefined, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return sendError(res, 'An error occurred during registration', 'SERVER_ERROR', error, 500);
  }
}

export default withErrorHandler(handler, 'register', 'User', 'Error during registration');
