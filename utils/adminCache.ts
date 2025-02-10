import { NextApiRequest, NextApiResponse } from 'next';
import { logModelActivity } from './adminActivity';
import { ActivityType, ActivitySubject } from './adminActivity';

export enum CacheTags {
  USER = 'USER',
  BLOG = 'BLOG',
  PRODUCT = 'PRODUCT',
  ACTIVITY = 'ACTIVITY',
  SETTINGS = 'SETTINGS',
}

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
    staleWhileRevalidate: 86400, // 24 hours
  },
};

interface CacheConfig {
  maxAge?: number;
  staleWhileRevalidate?: number;
  tags?: CacheTags[];
}

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;

export function withAuthCache(handler: ApiHandler, config: CacheConfig): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Only cache GET requests
    if (req.method === 'GET') {
      // Set cache control headers
      const cacheControl = [
        'public',
        `max-age=${config.maxAge || 0}`,
        `stale-while-revalidate=${config.staleWhileRevalidate || 0}`,
      ];

      res.setHeader('Cache-Control', cacheControl.join(', '));

      // Set cache tags if provided
      if (config.tags?.length) {
        res.setHeader('Cache-Tag', config.tags.join(', '));
      }

      // Log cache configuration
      await logModelActivity({
        req,
        action: ActivityType.SYSTEM_INFO,
        subject: ActivitySubject.SYSTEM,
        itemName: 'Cache Configuration',
        details: `Cache configured with maxAge=${config.maxAge}, staleWhileRevalidate=${config.staleWhileRevalidate}, tags=${config.tags?.join(', ')}`,
      }).catch(error => {
        console.error('Failed to log cache configuration:', error);
      });
    }

    return handler(req, res);
  };
}

export function clearCacheTags(tags: CacheTags[]): void {
  // This is a placeholder for cache invalidation logic
  // In a real implementation, this would communicate with your caching layer
  console.log('Cache tags cleared:', tags);
}

export function getCacheKey(parts: string[]): string {
  return parts.join(':');
}

export function parseCacheKey(key: string): string[] {
  return key.split(':');
}

export function isCacheStale(timestamp: number, maxAge: number): boolean {
  const now = Date.now();
  return now - timestamp > maxAge * 1000;
}

export function shouldRevalidateCache(timestamp: number, staleWhileRevalidate: number): boolean {
  const now = Date.now();
  return now - timestamp <= staleWhileRevalidate * 1000;
}
