import { NextApiResponse } from 'next';
import { sendBadRequest } from './adminResponse';

// MongoDB ObjectId regex pattern
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Validate a single MongoDB ObjectId
export function isValidObjectId(id: string): boolean {
  return OBJECT_ID_PATTERN.test(id);
}

// Validate an array of MongoDB ObjectIds
export function validateObjectIds(
  ids: string[],
  fieldName: string = 'id'
): { valid: boolean; errors?: { field: string; message: string }[] } {
  const invalidIds = ids.filter(id => !isValidObjectId(id));
  
  if (invalidIds.length > 0) {
    return {
      valid: false,
      errors: invalidIds.map(id => ({
        field: fieldName,
        message: `Invalid ID format: ${id}`,
      })),
    };
  }

  return { valid: true };
}

// Helper to validate and send error response for MongoDB ObjectIds
export function validateAndSendIdErrors(
  res: NextApiResponse,
  ids: string[],
  fieldName: string = 'id'
): boolean {
  const validation = validateObjectIds(ids, fieldName);
  if (!validation.valid && validation.errors) {
    sendBadRequest(res, `Invalid ${fieldName} format`, validation.errors);
    return true;
  }
  return false;
}

// Common validation rules for MongoDB ObjectIds
export const ObjectIdRule = {
  type: 'string',
  pattern: OBJECT_ID_PATTERN,
  message: 'Invalid ID format',
} as const;

// Common validation rules for arrays of MongoDB ObjectIds
export const ObjectIdArrayRule = {
  type: 'array',
  items: ObjectIdRule,
  message: 'Invalid ID format in array',
} as const;

// Helper to create a validation rule for references
export function createReferenceRule(
  model: string,
  required: boolean = true
): { type: string; required: boolean; pattern: RegExp; message: string } {
  return {
    type: 'string',
    required,
    pattern: OBJECT_ID_PATTERN,
    message: `Invalid ${model} reference ID`,
  };
}

// Helper to create a validation rule for arrays of references
export function createReferenceArrayRule(
  model: string,
  required: boolean = true,
  minItems?: number,
  maxItems?: number
): {
  type: string;
  required: boolean;
  items: { type: string; pattern: RegExp };
  minItems?: number;
  maxItems?: number;
  message: string;
} {
  return {
    type: 'array',
    required,
    items: {
      type: 'string',
      pattern: OBJECT_ID_PATTERN,
    },
    ...(minItems !== undefined && { minItems }),
    ...(maxItems !== undefined && { maxItems }),
    message: `Invalid ${model} reference IDs`,
  };
}

// Example usage:
/*
// Validate a single ID
if (!isValidObjectId(id)) {
  return sendBadRequest(res, 'Invalid ID format', [{
    field: 'id',
    message: `Invalid ID format: ${id}`,
  }]);
}

// Validate multiple IDs
const validation = validateObjectIds(productIds, 'productId');
if (!validation.valid) {
  return sendBadRequest(res, 'Invalid product ID format', validation.errors);
}

// Validate and send error response
if (validateAndSendIdErrors(res, orderIds, 'orderId')) {
  return;
}

// Use in validation rules
const validationRules = [
  {
    field: 'productId',
    ...ObjectIdRule,
  },
  {
    field: 'categoryIds',
    ...ObjectIdArrayRule,
  },
  {
    field: 'userId',
    ...createReferenceRule('User'),
  },
  {
    field: 'roleIds',
    ...createReferenceArrayRule('Role', true, 1, 5),
  },
];
*/

// Common validation patterns
export const ValidationPatterns = {
  // String patterns
  SLUG: /^[a-z0-9-]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-]{10,}$/,
  URL: /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/,
  SKU: /^[A-Z0-9-]+$/,
  COLOR_HEX: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  
  // Number patterns
  POSITIVE_INT: /^\d+$/,
  DECIMAL: /^\d*\.?\d+$/,
  PERCENTAGE: /^(100|[1-9]?\d)$/,
  CURRENCY: /^\d+\.?\d{0,2}$/,
  
  // Date patterns
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  DATETIME_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  
  // Custom patterns
  TAGS: /^[a-zA-Z0-9-]+(,[a-zA-Z0-9-]+)*$/,
  DIMENSIONS: /^\d+x\d+x\d+$/,
  COORDINATES: /^-?\d+\.?\d*,-?\d+\.?\d*$/,
} as const;

// Common validation messages
export const ValidationMessages = {
  REQUIRED: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max: number) => `Must be at most ${max} characters`,
  MIN_VALUE: (min: number) => `Must be at least ${min}`,
  MAX_VALUE: (max: number) => `Must be at most ${max}`,
  MIN_ITEMS: (min: number) => `Must have at least ${min} items`,
  MAX_ITEMS: (max: number) => `Must have at most ${max} items`,
  INVALID_ENUM: (values: string[]) => `Must be one of: ${values.join(', ')}`,
  INVALID_TYPE: (type: string) => `Must be a ${type}`,
  DUPLICATE: (field: string) => `${field} already exists`,
  NOT_FOUND: (resource: string) => `${resource} not found`,
} as const;
