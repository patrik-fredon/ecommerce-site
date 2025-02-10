import { IUserDocument } from '../models/User';
import { ApiUser } from '../types/auth';

/**
 * Convert a Mongoose user document to an API user object
 * @param userDoc User document from Mongoose
 * @returns API user object safe for client consumption
 */
export function toApiUser(userDoc: IUserDocument): ApiUser {
  return {
    id: userDoc._id.toString(),
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    isBlocked: userDoc.isBlocked,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt
  };
}

/**
 * Convert multiple Mongoose user documents to API user objects
 * @param userDocs Array of user documents from Mongoose
 * @returns Array of API user objects safe for client consumption
 */
export function toApiUsers(userDocs: IUserDocument[]): ApiUser[] {
  return userDocs.map(toApiUser);
}

/**
 * Type guard to check if a value is a valid API user
 * @param value Value to check
 * @returns True if value is a valid API user
 */
export function isApiUser(value: any): value is ApiUser {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.name === 'string' &&
    (value.role === 'user' || value.role === 'admin') &&
    typeof value.isBlocked === 'boolean' &&
    value.createdAt instanceof Date &&
    value.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if a value is an array of API users
 * @param value Value to check
 * @returns True if value is an array of API users
 */
export function isApiUserArray(value: any): value is ApiUser[] {
  return Array.isArray(value) && value.every(isApiUser);
}

/**
 * Helper to safely assert a value is a valid API user
 * @param value Value to assert
 * @throws Error if value is not a valid API user
 * @returns The value as an API user
 */
export function assertApiUser(value: any): ApiUser {
  if (!isApiUser(value)) {
    throw new Error('Invalid API user object');
  }
  return value;
}

/**
 * Helper to safely assert a value is an array of API users
 * @param value Value to assert
 * @throws Error if value is not an array of API users
 * @returns The value as an array of API users
 */
export function assertApiUserArray(value: any): ApiUser[] {
  if (!isApiUserArray(value)) {
    throw new Error('Invalid API user array');
  }
  return value;
}

/**
 * Helper to safely convert any value to an API user
 * @param value Value to convert
 * @throws Error if value cannot be converted to an API user
 * @returns The value as an API user
 */
export function ensureApiUser(value: any): ApiUser {
  if (value && typeof value === 'object') {
    if (value._id) {
      // Looks like a Mongoose document
      return toApiUser(value as IUserDocument);
    } else if (isApiUser(value)) {
      // Already an API user
      return value;
    }
  }
  throw new Error('Cannot convert value to API user');
}

/**
 * Helper to safely convert any value to an array of API users
 * @param value Value to convert
 * @throws Error if value cannot be converted to an array of API users
 * @returns The value as an array of API users
 */
export function ensureApiUsers(value: any): ApiUser[] {
  if (Array.isArray(value)) {
    return value.map(ensureApiUser);
  }
  throw new Error('Cannot convert value to API user array');
}
