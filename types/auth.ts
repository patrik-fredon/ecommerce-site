import { IUser } from '../models/User';
import { NextApiRequest } from 'next';
import mongoose, { Document } from 'mongoose';

// Common user fields
interface UserFields {
  name: string;
  email: string;
  role: 'user' | 'admin';
  isBlocked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Frontend user type (with string ID and ISO date strings)
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isBlocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

// API user type (Mongoose document)
export interface ApiUser extends Document, UserFields {
  _id: mongoose.Types.ObjectId;
}

// Lean user object from MongoDB
export interface LeanUser extends UserFields {
  _id: mongoose.Types.ObjectId;
}

// Convert Mongoose user or lean object to frontend user
export function toUserResponse(user: ApiUser | LeanUser): User {
  const dateToString = (date: Date | string) =>
    date instanceof Date ? date.toISOString() : new Date(date).toISOString();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: dateToString(user.createdAt),
    updatedAt: dateToString(user.updatedAt),
  };
}

// Extended request type for authenticated routes
export interface AuthRequest extends Omit<NextApiRequest, 'user'> {
  user?: ApiUser;
}

// Helper function to ensure user is authenticated
export function assertUser(req: AuthRequest): asserts req is AuthRequest & { user: ApiUser } {
  if (!req.user) {
    throw new Error('User is not authenticated');
  }
}
