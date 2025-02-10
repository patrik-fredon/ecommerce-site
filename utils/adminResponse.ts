import { NextApiResponse } from 'next';

interface SuccessResponse<T = any> {
  data: T;
  message?: string;
  meta?: {
    [key: string]: any;
  };
}

interface ErrorResponse {
  message: string;
  errors?: any[];
  code?: string;
  meta?: {
    [key: string]: any;
  };
}

interface PaginatedResponse<T> extends SuccessResponse<T> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function sendSuccess<T>(
  res: NextApiResponse,
  data: T,
  message?: string,
  meta?: { [key: string]: any },
  status: number = 200
) {
  const response: SuccessResponse<T> = {
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
  return res.status(status).json(response);
}

export function sendError(
  res: NextApiResponse,
  message: string,
  errors?: any[],
  code?: string,
  meta?: { [key: string]: any },
  status: number = 500
) {
  const response: ErrorResponse = {
    message,
    ...(errors && { errors }),
    ...(code && { code }),
    ...(meta && { meta }),
  };
  return res.status(status).json(response);
}

export function sendPaginated<T>(
  res: NextApiResponse,
  data: T[],
  {
    page,
    limit,
    total,
    message,
    meta = {},
  }: {
    page: number;
    limit: number;
    total: number;
    message?: string;
    meta?: { [key: string]: any };
  }
) {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  const response: PaginatedResponse<T[]> = {
    data,
    ...(message && { message }),
    meta: {
      ...meta,
      page,
      limit,
      total,
      totalPages,
      hasMore,
    },
  };
  return res.status(200).json(response);
}

export function sendNotFound(
  res: NextApiResponse,
  message: string = 'Resource not found',
  meta?: { [key: string]: any }
) {
  return sendError(res, message, undefined, 'NOT_FOUND', meta, 404);
}

export function sendBadRequest(
  res: NextApiResponse,
  message: string,
  errors?: any[],
  meta?: { [key: string]: any }
) {
  return sendError(res, message, errors, 'BAD_REQUEST', meta, 400);
}

export function sendUnauthorized(
  res: NextApiResponse,
  message: string = 'Unauthorized',
  meta?: { [key: string]: any }
) {
  return sendError(res, message, undefined, 'UNAUTHORIZED', meta, 401);
}

export function sendForbidden(
  res: NextApiResponse,
  message: string = 'Forbidden',
  meta?: { [key: string]: any }
) {
  return sendError(res, message, undefined, 'FORBIDDEN', meta, 403);
}

export function sendMethodNotAllowed(
  res: NextApiResponse,
  allowedMethods: string[],
  message: string = 'Method not allowed'
) {
  res.setHeader('Allow', allowedMethods);
  return sendError(res, message, undefined, 'METHOD_NOT_ALLOWED', undefined, 405);
}

// Example usage:
/*
// Success response
return sendSuccess(res, product, 'Product created successfully', { timestamp: new Date() }, 201);

// Error response
return sendError(res, 'Invalid input', validationErrors, 'VALIDATION_ERROR', { field: 'name' }, 400);

// Paginated response
return sendPaginated(res, products, {
  page: 1,
  limit: 10,
  total: 100,
  message: 'Products retrieved successfully',
  meta: { filters: { category: 'electronics' } },
});

// Common error responses
return sendNotFound(res, 'Product not found', { productId });
return sendBadRequest(res, 'Invalid input', validationErrors);
return sendUnauthorized(res, 'Invalid token');
return sendForbidden(res, 'Insufficient permissions');
return sendMethodNotAllowed(res, ['GET', 'POST'], 'PUT method not allowed');
*/

// Error codes
export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  OPERATION_FAILED: 'OPERATION_FAILED',
  INVALID_STATE: 'INVALID_STATE',
  INVALID_OPERATION: 'INVALID_OPERATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
