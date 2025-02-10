import { NextApiRequest } from 'next';
import { JWT } from 'next-auth/jwt';

export type UserRole = 'user' | 'admin';

export interface BaseUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ApiUser extends BaseUser {
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Omit<NextApiRequest, 'user'> {
  user?: ApiUser;
  params?: Record<string, string>;
}

// Extend the JWT type to include our custom fields
declare module 'next-auth/jwt' {
  interface JWT extends Partial<BaseUser> {
    isBlocked?: boolean;
  }
}

// Extend the Session type to include our custom fields
declare module 'next-auth' {
  interface Session {
    user: ApiUser;
  }

  interface User extends ApiUser {}
}

// Helper type for request validation
export interface ValidatedRequest<T = any> extends AuthRequest {
  validatedBody: T;
}

// Helper functions for type checking
export function isUser(user: any): user is ApiUser {
  return (
    user &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    typeof user.role === 'string' &&
    typeof user.isBlocked === 'boolean' &&
    user.createdAt instanceof Date &&
    user.updatedAt instanceof Date
  );
}

export function isAdmin(user?: ApiUser): boolean {
  return user?.role === 'admin';
}

export function isBlocked(user?: ApiUser): boolean {
  return user?.isBlocked ?? false;
}

export function hasValidSession(req: AuthRequest): boolean {
  return !!req.user && !isBlocked(req.user);
}
