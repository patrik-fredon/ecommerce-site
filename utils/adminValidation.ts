import { NextApiRequest, NextApiResponse } from 'next';
import { logModelActivity } from './adminActivity';
import { ActivityType, ActivitySubject } from './adminActivity';
import { sendError } from './adminResponse';

export interface ValidationRule {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

interface ValidationOptions {
  source: 'body' | 'query';
}

export function validateRequestAndSendError(
  req: NextApiRequest,
  res: NextApiResponse,
  rules: ValidationRule[],
  options: ValidationOptions
): void | NextApiResponse {
  const source = options.source === 'body' ? req.body : req.query;
  const errors: string[] = [];

  for (const rule of rules) {
    const value = source[rule.key];

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.key} is required`);
      continue;
    }

    // Skip further validation if value is not provided and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${rule.key} must be a string`);
          continue;
        }
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`${rule.key} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`${rule.key} must be at most ${rule.maxLength} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${rule.key} has an invalid format`);
        }
        break;

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${rule.key} must be a number`);
          continue;
        }
        if (rule.minValue !== undefined && num < rule.minValue) {
          errors.push(`${rule.key} must be at least ${rule.minValue}`);
        }
        if (rule.maxValue !== undefined && num > rule.maxValue) {
          errors.push(`${rule.key} must be at most ${rule.maxValue}`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push(`${rule.key} must be a boolean`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${rule.key} must be an array`);
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          errors.push(`${rule.key} must be an object`);
        }
        break;
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${rule.key} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : `${rule.key} is invalid`);
      }
    }
  }

  if (errors.length > 0) {
    // Log validation error
    logModelActivity({
      req,
      action: ActivityType.SYSTEM_WARNING,
      subject: ActivitySubject.SYSTEM,
      itemName: 'Validation Error',
      details: errors.join('; '),
    }).catch(error => {
      console.error('Failed to log validation error:', error);
    });

    return sendError(
      res,
      'Validation failed',
      'VALIDATION_ERROR',
      errors,
      400
    );
  }
}

export function validateData(
  data: any,
  rules: ValidationRule[]
): string[] {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.key];

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.key} is required`);
      continue;
    }

    // Skip further validation if value is not provided and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${rule.key} must be a string`);
          continue;
        }
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`${rule.key} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`${rule.key} must be at most ${rule.maxLength} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${rule.key} has an invalid format`);
        }
        break;

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${rule.key} must be a number`);
          continue;
        }
        if (rule.minValue !== undefined && num < rule.minValue) {
          errors.push(`${rule.key} must be at least ${rule.minValue}`);
        }
        if (rule.maxValue !== undefined && num > rule.maxValue) {
          errors.push(`${rule.key} must be at most ${rule.maxValue}`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push(`${rule.key} must be a boolean`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${rule.key} must be an array`);
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          errors.push(`${rule.key} must be an object`);
        }
        break;
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${rule.key} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : `${rule.key} is invalid`);
      }
    }
  }

  return errors;
}
