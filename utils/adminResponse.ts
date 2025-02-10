import { NextApiResponse } from 'next';

export type ApiErrorCode = 
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'DB_ERROR'
  | 'DUPLICATE_ERROR'
  | 'NOT_FOUND'
  | 'INVALID_ID'
  | 'SERVER_ERROR'
  | 'METHOD_NOT_ALLOWED';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
  meta?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Updated return types to void because NextApiResponse.json() returns void in our typings

export function sendSuccess<T = any>(
  res: NextApiResponse,
  data: T,
  message: string,
  meta?: Record<string, any>,
  status = 200
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    ...(meta && { meta }),
  };

  res.status(status).json(response);
}

export function sendError(
  res: NextApiResponse,
  message: string,
  code: ApiErrorCode,
  details?: any,
  status = 500
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(status).json(response);
}

export function sendMethodNotAllowed(
  res: NextApiResponse,
  allowedMethods: string[]
): void {
  res.setHeader('Allow', allowedMethods.join(', '));
  
  sendError(
    res,
    `Method not allowed. Use ${allowedMethods.join(' or ')}`,
    'METHOD_NOT_ALLOWED',
    null,
    405
  );
}

export function sendNotFound(
  res: NextApiResponse,
  message = 'Resource not found',
  details?: any
): void {
  sendError(
    res,
    message,
    'NOT_FOUND',
    details,
    404
  );
}

export function sendUnauthorized(
  res: NextApiResponse,
  message = 'Unauthorized access',
  details?: any
): void {
  sendError(
    res,
    message,
    'AUTH_ERROR',
    details,
    401
  );
}

export function sendForbidden(
  res: NextApiResponse,
  message = 'Access forbidden',
  details?: any
): void {
  sendError(
    res,
    message,
    'AUTH_ERROR',
    details,
    403
  );
}

export function sendBadRequest(
  res: NextApiResponse,
  message: string,
  details?: any
): void {
  sendError(
    res,
    message,
    'VALIDATION_ERROR',
    details,
    400
  );
}

export function sendConflict(
  res: NextApiResponse,
  message: string,
  details?: any
): void {
  sendError(
    res,
    message,
    'DUPLICATE_ERROR',
    details,
    409
  );
}

export function sendServerError(
  res: NextApiResponse,
  message = 'Internal server error',
  details?: any
): void {
  sendError(
    res,
    message,
    'SERVER_ERROR',
    details,
    500
  );
}
