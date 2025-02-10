import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import BlogPost from '../../../../models/BlogPost';
import { logModelActivity, logBulkActivity } from '../../../../utils/adminActivity';
import { ActivityType, ActivitySubject } from '../../../../utils/adminActivity';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import { withCache, CacheTags, CacheConfigs, combineTags } from '../../../../utils/adminCache';
import { validateRequest, validateRequestAndSendError } from '../../../../utils/adminValidation';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendMethodNotAllowed,
  sendPaginated,
} from '../../../../utils/adminResponse';
import {
  getPaginationParams,
  buildQuery,
  applyFilters,
} from '../../../../utils/adminPagination';

async function blogPostsHandler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const { skip, limit, page, sort } = getPaginationParams(req, {
          defaultLimit: 20,
          maxLimit: 50,
        });

        const query = buildQuery(req, {
          search: {
            fields: ['title', 'content', 'excerpt', 'author'],
            term: req.query.search as string,
          },
          dateRange: {
            field: 'publishedAt',
            start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
            end: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          },
        });

        const filters = applyFilters(req, [
          { 
            field: 'published', 
            values: ['true', 'false'], 
            type: 'boolean' 
          },
          { 
            field: 'author', 
            values: [], // Dynamic values from actual authors
            type: 'exact' 
          }
        ]);

        const finalQuery = { ...query, ...filters };

        const [posts, total] = await Promise.all([
          BlogPost.find(finalQuery)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
          BlogPost.countDocuments(finalQuery),
        ]);

        // Get blog statistics
        const [stats] = await BlogPost.aggregate([
          {
            $group: {
              _id: null,
              totalPosts: { $sum: 1 },
              publishedPosts: { $sum: { $cond: ['$published', 1, 0] } },
              avgWordCount: {
                $avg: {
                  $size: { $split: ['$content', ' '] }
                }
              },
              authors: { $addToSet: '$author' },
            }
          },
          {
            $project: {
              _id: 0,
              totalPosts: 1,
              publishedPosts: 1,
              avgWordCount: { $round: ['$avgWordCount', 0] },
              uniqueAuthors: { $size: '$authors' },
            }
          }
        ]);

        return sendPaginated(res, posts, {
          page,
          limit,
          total,
          message: 'Blog posts retrieved successfully',
          meta: {
            stats: stats || {
              totalPosts: 0,
              publishedPosts: 0,
              avgWordCount: 0,
              uniqueAuthors: 0,
            },
            filters: req.query,
          },
        });
      } catch (error) {
        throw error;
      }
      break;

    case 'POST':
      try {
        const postValidation = validateRequestAndSendError(
          req,
          res,
          [
            {
              field: 'title',
              type: 'string',
              required: true,
              min: 5,
              max: 200,
            },
            {
              field: 'content',
              type: 'string',
              required: true,
              min: 50,
            },
            {
              field: 'excerpt',
              type: 'string',
              required: true,
              min: 10,
              max: 500,
            },
            {
              field: 'slug',
              type: 'string',
              pattern: /^[a-z0-9-]+$/,
            },
            {
              field: 'published',
              type: 'boolean',
            },
          ],
          { source: 'body', allowUnknown: false }
        );

        if (postValidation) {
          return postValidation;
        }

        // Generate slug if not provided
        if (!req.body.slug) {
          req.body.slug = req.body.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        }

        const post = await BlogPost.create({
          ...req.body,
          author: req.user?.name || 'Admin',
        });

        await logModelActivity({
          req,
          action: ActivityType.BLOG_CREATED,
          subject: ActivitySubject.BLOG,
          itemName: post.title,
        });

        return sendSuccess(res, post, 'Blog post created successfully', undefined, 201);
      } catch (error) {
        throw error;
      }
      break;

    case 'PATCH':
      try {
        const { operation } = req.body;

        if (!operation) {
          return sendBadRequest(res, 'Operation not specified');
        }

        switch (operation) {
          case 'bulk-publish':
            const { postIds, publish } = req.body;
            const bulkValidation = validateRequestAndSendError(
              req,
              res,
              [
                {
                  field: 'postIds',
                  type: 'array',
                  required: true,
                  min: 1,
                },
                {
                  field: 'publish',
                  type: 'boolean',
                  required: true,
                },
              ],
              { source: 'body', allowUnknown: false }
            );

            if (bulkValidation) {
              return bulkValidation;
            }

            // Validate each post ID
            for (const id of postIds) {
              if (!/^[0-9a-fA-F]{24}$/.test(id)) {
                return sendBadRequest(res, 'Invalid post ID format', [{
                  field: 'postIds',
                  message: `Invalid ID format: ${id}`,
                }]);
              }
            }

            const updateData = publish
              ? { published: true, publishedAt: new Date() }
              : { published: false, $unset: { publishedAt: 1 } };

            const updatedPosts = await BlogPost.updateMany(
              { _id: { $in: postIds } },
              publish ? { $set: updateData } : updateData
            );

            await logBulkActivity({
              req,
              action: publish ? ActivityType.BULK_PUBLISH : ActivityType.BULK_UNPUBLISH,
              subject: ActivitySubject.BLOG,
              count: postIds.length,
            });

            return sendSuccess(
              res,
              { modifiedCount: updatedPosts.modifiedCount },
              `Successfully ${publish ? 'published' : 'unpublished'} ${updatedPosts.modifiedCount} posts`
            );

          default:
            return sendBadRequest(res, 'Invalid operation');
        }
      } catch (error) {
        throw error;
      }
      break;

    default:
      return sendMethodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  }
}

export default withAdminAuth(
  withCache(
    withErrorHandler(
      blogPostsHandler,
      'manage',
      'Blog Posts',
      'Error managing blog posts'
    ),
    {
      ...CacheConfigs.mediumTerm,
      tags: combineTags(
        [CacheTags.BLOG],
        [CacheTags.STATS]
      ),
    }
  )
);
