import { NextApiRequest, NextApiResponse } from 'next';
import { AuthRequest } from '../types/auth';
import { sendBadRequest } from './adminResponse';

interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
  message?: string;
}

interface ValidationOptions {
  source?: 'body' | 'query' | 'params';
  allowUnknown?: boolean;
}

export function validateRequest(
  req: NextApiRequest | AuthRequest,
  rules: ValidationRule[],
  options: ValidationOptions = {}
) {
  const { source = 'body', allowUnknown = false } = options;
  const data = source === 'body' ? req.body : req.query;
  const errors: { field: string; message: string }[] = [];

  // Check for required fields and unknown fields
  const allowedFields = rules.map(rule => rule.field);
  if (!allowUnknown) {
    Object.keys(data).forEach(field => {
      if (!allowedFields.includes(field)) {
        errors.push({
          field,
          message: `Unknown field: ${field}`,
        });
      }
    });
  }

  rules.forEach(rule => {
    const value = data[rule.field];

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: rule.field,
        message: `${rule.field} is required`,
      });
      return;
    }

    // Skip validation if value is not required and not provided
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be a string`,
          });
          return;
        }

        if (rule.min && value.length < rule.min) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at least ${rule.min} characters`,
          });
        }

        if (rule.max && value.length > rule.max) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at most ${rule.max} characters`,
          });
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push({
            field: rule.field,
            message: `${rule.field} has invalid format`,
          });
        }
        break;

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be a number`,
          });
          return;
        }

        if (rule.min !== undefined && num < rule.min) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at least ${rule.min}`,
          });
        }

        if (rule.max !== undefined && num > rule.max) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at most ${rule.max}`,
          });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be a boolean`,
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be an array`,
          });
          return;
        }

        if (rule.min !== undefined && value.length < rule.min) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must have at least ${rule.min} items`,
          });
        }

        if (rule.max !== undefined && value.length > rule.max) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must have at most ${rule.max} items`,
          });
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be an object`,
          });
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be a valid date`,
          });
        }
        break;
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        errors.push({
          field: rule.field,
          message: typeof result === 'string' ? result : `Invalid ${rule.field}`,
        });
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field: rule.field,
        message: `${rule.field} must be one of: ${rule.enum.join(', ')}`,
      });
    }
  });

  return errors;
}

export function validateRequestAndSendError(
  req: NextApiRequest | AuthRequest,
  res: NextApiResponse,
  rules: ValidationRule[],
  options: ValidationOptions = {}
) {
  const errors = validateRequest(req, rules, options);
  if (errors.length > 0) {
    return sendBadRequest(res, 'Validation error', errors);
  }
  return null;
}

// Example usage:
/*
// Validate request body
const validationResult = validateRequestAndSendError(
  req,
  res,
  [
    {
      field: 'name',
      type: 'string',
      required: true,
      min: 2,
      max: 50,
      pattern: /^[a-zA-Z\s]+$/,
    },
    {
      field: 'email',
      type: 'string',
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      custom: (value) => {
        // Additional custom validation
        return value.includes('@') || 'Invalid email format';
      },
    },
    {
      field: 'age',
      type: 'number',
      required: true,
      min: 18,
      max: 100,
    },
    {
      field: 'roles',
      type: 'array',
      required: true,
      min: 1,
      enum: ['admin', 'user', 'editor'],
    },
    {
      field: 'settings',
      type: 'object',
      required: true,
    },
    {
      field: 'birthDate',
      type: 'date',
      required: true,
    },
  ],
  { source: 'body', allowUnknown: false }
);

if (validationResult) {
  return; // Request was invalid and error response was sent
}

// Validate query parameters
const queryValidation = validateRequestAndSendError(
  req,
  res,
  [
    {
      field: 'page',
      type: 'number',
      min: 1,
    },
    {
      field: 'limit',
      type: 'number',
      min: 1,
      max: 100,
    },
    {
      field: 'sort',
      type: 'string',
      enum: ['asc', 'desc'],
    },
  ],
  { source: 'query', allowUnknown: true }
);

if (queryValidation) {
  return; // Request was invalid and error response was sent
}
*/
