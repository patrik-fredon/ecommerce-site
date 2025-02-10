import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import { blogService } from '../../../../services/BlogService';
import { logModelActivity } from '../../../../utils/adminActivity';
import { ActivityType, ActivitySubject } from '../../../../utils/adminActivity';
import { withCache, CacheTags, CacheConfigs } from '../../../../utils/adminCache';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import { validateRequestAndSendError } from '../../../../utils/adminValidation';
import { ValidationMessages } from '../../../../utils/adminValidators';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendMethodNotAllowed,
  sendPaginated
} from '../../../../utils/adminResponse';
import {
  getPaginationParams,
  buildQuery,
  applyFilters,
} from '../../../../utils/adminPagination';

async function handler(req: AuthRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      try {
        const { skip, limit, page, sort } = getPaginationParams(req, {
          defaultLimit: 10,
          maxLimit: 50
        });

        const query = buildQuery(req, {
          search: {
            fields: ['title', 'content', 'author'],
            term: req.query.search as string,
          },
          dateRange: {
            field: 'createdAt',
            start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
            end: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          },
        });

        const filters = applyFilters(req, [
          { field: 'published', values: ['true', 'false'], type: 'boolean' },
          { field: 'author', values: req.query.author ? [req.query.author as string] : [], type: 'exact' }
        ]);

        const [posts, total] = await Promise.all([
          blogService.find(
            { ...query, ...filters },
            { skip, limit, sort }
          ),
          blogService.count({ ...query, ...filters })
        ]);

        return sendPaginated(res, posts, {
          page,
          limit,
          total,
          message: 'Blog posts retrieved successfully'
        });
      } catch (error) {
        throw error;
      }

    case 'POST':
      try {
        const validation = validateRequestAndSendError(
          req,
          res,
          [
            {
              field: 'title',
              type: 'string',
              required: true,
              min: 3,
              max: 200,
              message: ValidationMessages.MIN_LENGTH(3)
            },
            {
              field: 'content',
              type: 'string',
              required: true,
              min: 10,
              message: ValidationMessages.MIN_LENGTH(10)
            },
            {
              field: 'excerpt',
              type: 'string',
              required: true,
              max: 500,
              message: ValidationMessages.MAX_LENGTH(500)
            },
            {
              field: 'author',
              type: 'string',
              required: true
            },
            {
              field: 'image',
              type: 'string',
              required: true,
              message: 'Featured image URL is required'
            },
            {
              field: 'published',
              type: 'boolean'
            }
          ],
          { source: 'body' }
        );

        if (validation) {
          return validation;
        }

        const post = await blogService.create({
          ...req.body,
          publishedAt: req.body.published ? new Date() : undefined
        });

        await logModelActivity({
          req,
          action: ActivityType.BLOG_CREATED,
          subject: ActivitySubject.BLOG,
          itemName: post.title
        });

        return sendSuccess(res, post, 'Blog post created successfully', undefined, 201);
      } catch (error) {
        throw error;
      }

    default:
      return sendMethodNotAllowed(res, ['GET', 'POST']);
  }
}

export default withAdminAuth(
  withCache(
    withErrorHandler(handler, 'manage', 'Blog Posts', 'Error managing blog posts'),
    {
      ...CacheConfigs.shortTerm,
      tags: [CacheTags.BLOG]
    }
  )
);
