import { NextApiRequest, NextApiResponse } from 'next';
import { AuthRequest } from '../../types/auth';
import { withMiddleware, MiddlewareHandler, AuthMiddlewareHandler } from '../middleware/withMiddleware';

export enum CacheTags {
  PRODUCTS = 'products',
  ORDERS = 'orders',
  BLOG = 'blog',
  USERS = 'users',
  FEATURED = 'featured',
  STATS = 'stats',
  ACTIVITY = 'activity'
}

export const CacheConfigs = {
  // Short-term caching (30 seconds)
  shortTerm: {
    maxAge: 30,
    staleWhileRevalidate: 59,
    revalidate: true
  },
  // Medium-term caching (5 minutes)
  mediumTerm: {
    maxAge: 300,
    staleWhileRevalidate: 599,
    revalidate: true
  },
  // Long-term caching (1 hour)
  longTerm: {
    maxAge: 3600,
    staleWhileRevalidate: 7199,
    revalidate: true
  }
} as const;

interface CacheOptions {
  maxAge?: number;
  staleWhileRevalidate?: number;
  tags?: CacheTags[];
  revalidate?: boolean;
}

// Combine multiple cache tags
export function combineTags(...tagArrays: CacheTags[][]): CacheTags[] {
  return Array.from(new Set(tagArrays.flat()));
}

// Helper to create cache key from request
function createCacheKey(req: NextApiRequest | AuthRequest): string {
  const { url, headers } = req;
  const userRole = 'user' in req ? req.user?.role : headers['x-user-role'];
  return `${userRole || 'public'}:${url}`;
}

// Cache middleware for regular requests
export function withCache(handler: MiddlewareHandler, options: CacheOptions = {}) {
  return withMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
    const cacheKey = createCacheKey(req);
    
    // Add cache control headers
    if (options.maxAge) {
      res.setHeader(
        'Cache-Control',
        `s-maxage=${options.maxAge}, stale-while-revalidate=${options.staleWhileRevalidate || options.maxAge}`
      );
    }

    // Add cache tags header if provided
    if (options.tags?.length) {
      res.setHeader('Cache-Tag', options.tags.join(','));
    }

    return handler(req, res);
  });
}

// Cache middleware for authenticated requests
export function withAuthCache(handler: AuthMiddlewareHandler, options: CacheOptions = {}) {
  return withMiddleware<AuthRequest>(async (req: AuthRequest, res: NextApiResponse) => {
    const cacheKey = createCacheKey(req);
    
    // Add cache control headers
    if (options.maxAge) {
      res.setHeader(
        'Cache-Control',
        `s-maxage=${options.maxAge}, stale-while-revalidate=${options.staleWhileRevalidate || options.maxAge}`
      );
    }

    // Add cache tags header if provided
    if (options.tags?.length) {
      res.setHeader('Cache-Tag', options.tags.join(','));
    }

    return handler(req, res);
  });
}
