import { NextApiRequest } from 'next';
import { AuthRequest } from '../types/auth';
import { sendPaginated } from './adminResponse';

interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

interface PaginationResult {
  skip: number;
  limit: number;
  page: number;
  sort: { [key: string]: 1 | -1 };
}

export function getPaginationParams(
  req: NextApiRequest | AuthRequest,
  options: PaginationOptions = {}
): PaginationResult {
  const {
    defaultLimit = 10,
    maxLimit = 100,
  } = options;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  let limit = parseInt(req.query.limit as string) || defaultLimit;
  limit = Math.min(limit, maxLimit);

  const sort = req.query.sort as string || 'createdAt';
  const order = (req.query.order as string || 'desc').toLowerCase();

  return {
    skip: (page - 1) * limit,
    limit,
    page,
    sort: { [sort]: order === 'asc' ? 1 : -1 },
  };
}

interface QueryOptions {
  filter?: { [key: string]: any };
  search?: {
    fields: string[];
    term: string;
  };
  dateRange?: {
    field: string;
    start?: Date;
    end?: Date;
  };
}

export function buildQuery(
  req: NextApiRequest | AuthRequest,
  options: QueryOptions = {}
): { [key: string]: any } {
  const query: { [key: string]: any } = { ...options.filter };

  // Add search functionality
  if (options.search && req.query.search) {
    const searchRegex = new RegExp(req.query.search as string, 'i');
    query.$or = options.search.fields.map(field => ({
      [field]: searchRegex,
    }));
  }

  // Add date range filtering
  if (options.dateRange) {
    const { field, start, end } = options.dateRange;
    const dateQuery: { [key: string]: any } = {};

    if (start) dateQuery.$gte = start;
    if (end) dateQuery.$lte = end;

    if (Object.keys(dateQuery).length > 0) {
      query[field] = dateQuery;
    }
  }

  return query;
}

interface FilterOption {
  field: string;
  values: string[];
  type?: 'exact' | 'in' | 'exists' | 'boolean';
}

export function applyFilters(
  req: NextApiRequest | AuthRequest,
  options: FilterOption[]
): { [key: string]: any } {
  const query: { [key: string]: any } = {};

  options.forEach(({ field, values, type = 'exact' }) => {
    const value = req.query[field];
    if (!value) return;

    switch (type) {
      case 'in':
        if (Array.isArray(value)) {
          query[field] = { $in: value };
        } else if (values.includes(value as string)) {
          query[field] = value;
        }
        break;

      case 'exists':
        if (value === 'true') query[field] = { $exists: true };
        if (value === 'false') query[field] = { $exists: false };
        break;

      case 'boolean':
        if (value === 'true') query[field] = true;
        if (value === 'false') query[field] = false;
        break;

      default:
        if (values.includes(value as string)) {
          query[field] = value;
        }
    }
  });

  return query;
}

// Example usage:
/*
async function handler(req: NextApiRequest | AuthRequest, res: NextApiResponse) {
  const { skip, limit, page, sort } = getPaginationParams(req, {
    defaultLimit: 20,
    maxLimit: 50,
  });

  const query = buildQuery(req, {
    filter: { published: true },
    search: {
      fields: ['title', 'content'],
      term: req.query.search as string,
    },
    dateRange: {
      field: 'createdAt',
      start: new Date(req.query.startDate as string),
      end: new Date(req.query.endDate as string),
    },
  });

  const filters = applyFilters(req, [
    { field: 'status', values: ['active', 'inactive'] },
    { field: 'category', values: ['electronics', 'books'], type: 'in' },
    { field: 'featured', values: ['true', 'false'], type: 'boolean' },
  ]);

  const finalQuery = { ...query, ...filters };

  const [items, total] = await Promise.all([
    Model.find(finalQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Model.countDocuments(finalQuery),
  ]);

  return sendPaginated(res, items, {
    page,
    limit,
    total,
    message: 'Items retrieved successfully',
  });
}
*/
