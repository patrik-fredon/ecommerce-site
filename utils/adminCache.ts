import { NextApiRequest, NextApiResponse } from 'next';
import { AuthRequest } from '../types/auth';

interface CacheOptions {
  maxAge?: number;
  staleWhileRevalidate?: number;
  tags?: string[];
  private?: boolean;
  revalidate?: boolean;
}

const DEFAULT_OPTIONS: CacheOptions = {
  maxAge: 60, // 1 minute
  staleWhileRevalidate: 300, // 5 minutes
  private: true,
  revalidate: true,
};

export function setCacheHeaders(
  res: NextApiResponse,
  options: CacheOptions = {}
) {
  const {
    maxAge = DEFAULT_OPTIONS.maxAge,
    staleWhileRevalidate = DEFAULT_OPTIONS.staleWhileRevalidate,
    private: isPrivate = DEFAULT_OPTIONS.private,
    tags = [],
  } = options;

  const directives = [
    isPrivate ? 'private' : 'public',
    `max-age=${maxAge}`,
    `stale-while-revalidate=${staleWhileRevalidate}`,
  ];

  res.setHeader('Cache-Control', directives.join(', '));

  if (tags.length > 0) {
    res.setHeader('Cache-Tag', tags.join(', '));
  }
}

export function withCache(
  handler: (req: AuthRequest, res: NextApiResponse) => Promise<void>,
  options: CacheOptions = {}
) {
  return async (req: AuthRequest, res: NextApiResponse) => {
    // Only cache GET requests
    if (req.method === 'GET') {
      setCacheHeaders(res, options);
    }

    return handler(req, res);
  };
}

export function clearCache(tags: string[]) {
  // This would integrate with your caching solution (e.g., Redis, Memcached)
  // to invalidate cached responses with matching tags
  console.log('Cache cleared for tags:', tags);
}

// Example usage:
/*
// Using the withCache wrapper
export default withAdminAuth(
  withCache(
    withErrorHandler(
      async (req: AuthRequest, res: NextApiResponse) => {
        // Your handler code
      },
      'fetch',
      'Products',
      'Error fetching products'
    ),
    {
      maxAge: 300, // 5 minutes
      staleWhileRevalidate: 600, // 10 minutes
      tags: ['products'],
      private: true,
    }
  )
);

// Using setCacheHeaders directly
export default withAdminAuth(
  withErrorHandler(
    async (req: AuthRequest, res: NextApiResponse) => {
      setCacheHeaders(res, {
        maxAge: 60,
        tags: ['products', 'featured'],
      });
      // Your handler code
    },
    'fetch',
    'Products',
    'Error fetching products'
  )
);

// Clearing cache
clearCache(['products', 'featured']);
*/

// Cache tag constants
export const CacheTags = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  BLOG: 'blog',
  USERS: 'users',
  FEATURED: 'featured',
  STATS: 'stats',
} as const;

// Helper to generate cache options
export function getCacheOptions(
  tags: string[],
  maxAge: number = DEFAULT_OPTIONS.maxAge!,
  staleWhileRevalidate: number = DEFAULT_OPTIONS.staleWhileRevalidate!,
  isPrivate: boolean = DEFAULT_OPTIONS.private!
): CacheOptions {
  return {
    maxAge,
    staleWhileRevalidate,
    tags,
    private: isPrivate,
  };
}

// Common cache configurations
export const CacheConfigs = {
  shortTerm: {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 300, // 5 minutes
  },
  mediumTerm: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 900, // 15 minutes
  },
  longTerm: {
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 7200, // 2 hours
  },
  stats: {
    maxAge: 900, // 15 minutes
    staleWhileRevalidate: 1800, // 30 minutes
  },
} as const;

// Helper to combine cache tags
export function combineTags(...tagSets: string[][]): string[] {
  return Array.from(new Set(tagSets.flat()));
}

// Helper to generate cache key
export function generateCacheKey(
  path: string,
  query: { [key: string]: string | string[] | undefined }
): string {
  const queryString = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `${path}${queryString ? `?${queryString}` : ''}`;
}

// Helper to parse cache tags from response headers
export function parseCacheTags(res: NextApiResponse): string[] {
  const tags = res.getHeader('Cache-Tag') as string | string[] | undefined;
  if (!tags) return [];
  return (Array.isArray(tags) ? tags.join(', ') : tags).split(', ');
}

// Helper to check if response is cacheable
export function isCacheable(req: AuthRequest, res: NextApiResponse): boolean {
  if (req.method !== 'GET') return false;
  if (res.statusCode !== 200) return false;
  
  const cacheControl = res.getHeader('Cache-Control') as string | string[] | undefined;
  if (!cacheControl) return false;
  
  const cacheControlStr = Array.isArray(cacheControl) ? cacheControl.join(', ') : cacheControl;
  const noStore = cacheControlStr.toLowerCase().includes('no-store');
  
  return !noStore;
}
