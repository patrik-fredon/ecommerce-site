import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { MongoError } from 'mongodb';
import { logModelActivity } from './adminActivity';
import { ActivityType, ActivitySubject } from './adminActivity';
import { sendError } from './adminResponse';

interface ErrorHandlerOptions {
  action: string;
  subject: string;
  errorMessage: string;
}

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;

export function withErrorHandler(
  handler: ApiHandler,
  action: string,
  subject: string,
  errorMessage: string
): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      return await handler(req, res);
    } catch (err) {
      const error = err as Error | MongoError;
      console.error(`Error in ${action} ${subject}:`, error);

      // Log error activity
      await logModelActivity({
        req,
        action: ActivityType.SYSTEM_ERROR,
        subject: ActivitySubject.SYSTEM,
        itemName: `${action} ${subject}`,
        details: error.message,
      }).catch(logError => {
        console.error('Failed to log error activity:', logError);
      });

      // Handle MongoDB errors
      if (error instanceof MongoError) {
        if (error.code === 11000) {
          return sendError(
            res,
            'A duplicate entry was found',
            'DUPLICATE_ERROR',
            process.env.NODE_ENV === 'development' ? error : null,
            409
          );
        }

        return sendError(
          res,
          'Database operation failed',
          'DB_ERROR',
          process.env.NODE_ENV === 'development' ? error : null,
          500
        );
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        return sendError(
          res,
          'Invalid data provided',
          'VALIDATION_ERROR',
          process.env.NODE_ENV === 'development' ? error : null,
          400
        );
      }

      // Handle cast errors
      if (error.name === 'CastError') {
        return sendError(
          res,
          'Invalid ID format',
          'INVALID_ID',
          process.env.NODE_ENV === 'development' ? error : null,
          400
        );
      }

      // Handle other errors
      return sendError(
        res,
        errorMessage,
        'SERVER_ERROR',
        process.env.NODE_ENV === 'development' ? error : undefined,
        500
      );
    }
  };
}

export function handleApiError(
  error: unknown,
  res: NextApiResponse,
  options: ErrorHandlerOptions
): void | NextApiResponse {
  console.error(`Error in ${options.action} ${options.subject}:`, error);

  if (error instanceof MongoError) {
    if (error.code === 11000) {
      return sendError(
        res,
        'A duplicate entry was found',
        'DUPLICATE_ERROR',
        process.env.NODE_ENV === 'development' ? error : null,
        409
      );
    }

    return sendError(
      res,
      'Database operation failed',
      'DB_ERROR',
      process.env.NODE_ENV === 'development' ? error : null,
      500
    );
  }

  const err = error as Error;

  if (err.name === 'ValidationError') {
    return sendError(
      res,
      'Invalid data provided',
      'VALIDATION_ERROR',
      process.env.NODE_ENV === 'development' ? err : null,
      400
    );
  }

  if (err.name === 'CastError') {
    return sendError(
      res,
      'Invalid ID format',
      'INVALID_ID',
      process.env.NODE_ENV === 'development' ? err : null,
      400
    );
  }

  return sendError(
    res,
    options.errorMessage,
    'SERVER_ERROR',
    process.env.NODE_ENV === 'development' ? err : undefined,
    500
  );
}
