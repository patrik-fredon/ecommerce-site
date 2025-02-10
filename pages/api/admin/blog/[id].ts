import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import BlogPost from '../../../../models/BlogPost';
import { logModelActivity } from '../../../../utils/adminActivity';
import { ActivityType, ActivitySubject } from '../../../../utils/adminActivity';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import { withCache, CacheTags, CacheConfigs, combineTags } from '../../../../utils/adminCache';
import { validateRequest, validateRequestAndSendError } from '../../../../utils/adminValidation';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendMethodNotAllowed,
} from '../../../../utils/adminResponse';

async function blogPostHandler(req: AuthRequest, res: NextApiResponse) {
  const {
    query: { id },
    method,
  } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const post = await BlogPost.findById(id).lean();
        if (!post) {
          return sendNotFound(res, 'Blog post not found');
        }
        return sendSuccess(res, post);
      } catch (error) {
        throw error;
      }
      break;

    case 'PUT':
      try {
        const updateValidation = validateRequestAndSendError(
          req,
          res,
          [
            {
              field: 'title',
              type: 'string',
              min: 5,
              max: 200,
            },
            {
              field: 'content',
              type: 'string',
              min: 50,
            },
            {
              field: 'excerpt',
              type: 'string',
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

        if (updateValidation) {
          return updateValidation;
        }

        const post = await BlogPost.findByIdAndUpdate(
          id,
          { $set: req.body },
          { new: true, runValidators: true }
        );

        if (!post) {
          return sendNotFound(res, 'Blog post not found');
        }

        await logModelActivity({
          req,
          action: ActivityType.BLOG_UPDATED,
          subject: ActivitySubject.BLOG,
          itemName: post.title,
        });

        return sendSuccess(res, post, 'Blog post updated successfully');
      } catch (error) {
        throw error;
      }
      break;

    case 'DELETE':
      try {
        const post = await BlogPost.findByIdAndDelete(id);
        if (!post) {
          return sendNotFound(res, 'Blog post not found');
        }

        await logModelActivity({
          req,
          action: ActivityType.BLOG_DELETED,
          subject: ActivitySubject.BLOG,
          itemName: post.title,
        });

        return sendSuccess(res, null, 'Blog post deleted successfully');
      } catch (error) {
        throw error;
      }
      break;

    case 'PATCH':
      try {
        const patchValidation = validateRequestAndSendError(
          req,
          res,
          [
            {
              field: 'operation',
              type: 'string',
              required: true,
              enum: ['publish', 'unpublish'],
            },
          ],
          { source: 'body', allowUnknown: false }
        );

        if (patchValidation) {
          return patchValidation;
        }

        const { operation } = req.body;
        let post;

        switch (operation) {
          case 'publish':
            post = await BlogPost.findByIdAndUpdate(
              id,
              { $set: { published: true, publishedAt: new Date() } },
              { new: true }
            );

            if (!post) {
              return sendNotFound(res, 'Blog post not found');
            }

            await logModelActivity({
              req,
              action: ActivityType.BLOG_PUBLISHED,
              subject: ActivitySubject.BLOG,
              itemName: post.title,
            });

            return sendSuccess(res, post);

          case 'unpublish':
            post = await BlogPost.findByIdAndUpdate(
              id,
              { $set: { published: false }, $unset: { publishedAt: 1 } },
              { new: true }
            );

            if (!post) {
              return sendNotFound(res, 'Blog post not found');
            }

            await logModelActivity({
              req,
              action: ActivityType.BLOG_UNPUBLISHED,
              subject: ActivitySubject.BLOG,
              itemName: post.title,
            });

            return sendSuccess(res, post);

          default:
            return sendBadRequest(res, 'Invalid operation');
        }
      } catch (error) {
        throw error;
      }
      break;

    default:
      return sendMethodNotAllowed(res, ['GET', 'PUT', 'DELETE', 'PATCH']);
  }
}

export default withAdminAuth(
  withCache(
    withErrorHandler(
      blogPostHandler,
      'manage',
      'Blog Post',
      'Error managing blog post'
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
