import { NextApiResponse } from 'next';
import { AuthRequest } from '../types/auth';
import { logAdminError } from './adminLogger';

interface ErrorOptions {
  req: AuthRequest;
  res: NextApiResponse;
  error: unknown;
  operation: string;
  subject: string;
  defaultMessage?: string;
}

export async function handleAdminError({
  req,
  res,
  error,
  operation,
  subject,
  defaultMessage = 'An error occurred',
}: ErrorOptions) {
  const user = req.user;
  const errorMessage = error instanceof Error ? error.message : defaultMessage;

  // Log the error
  await logAdminError({
    action: operation,
    subject,
    details: errorMessage,
    adminName: user?.name,
    adminId: user?._id?.toString(),
  });

  // Handle specific error types
  if (error instanceof Error) {
    // Mongoose validation error
    if ((error as any).name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values((error as any).errors).map((err: any) => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

    // Mongoose duplicate key error
    if ((error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern)[0];
      return res.status(400).json({
        message: `Duplicate ${field}`,
        field,
      });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired',
      });
    }
  }

  // Default error response
  console.error(`Admin API Error (${operation} ${subject}):`, error);
  return res.status(500).json({
    message: defaultMessage,
    ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
  });
}

// Helper for handling async route handlers
export function withErrorHandler(
  handler: (req: AuthRequest, res: NextApiResponse) => Promise<any>,
  operation: string,
  subject: string,
  defaultMessage?: string
) {
  return async (req: AuthRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      await handleAdminError({
        req,
        res,
        error,
        operation,
        subject,
        defaultMessage,
      });
    }
  };
}

// Example usage:
/*
export default withAdminAuth(
  withErrorHandler(
    async (req: AuthRequest, res: NextApiResponse) => {
      // Your route handler code here
      const { id } = req.query;
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.status(200).json(product);
    },
    'get',
    'Product',
    'Error fetching product'
  )
);

// Or with the error handler directly:
try {
  // Your code here
} catch (error) {
  await handleAdminError({
    req,
    res,
    error,
    operation: 'update',
    subject: 'Order',
    defaultMessage: 'Error updating order',
  });
}
*/
