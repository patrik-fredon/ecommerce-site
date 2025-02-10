import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import BlogPost from '../../../../models/BlogPost';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import {
  DatePeriod,
  getDateFilter,
  formatDateRange,
  getDateRangeDescription,
  fillMissingDates,
  aggregateByTimeUnit,
} from '../../../../utils/dateFilters';

async function blogStatsHandler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  await dbConnect();
    const { period = '30d', timeUnit = 'day' } = req.query;
    const dateFilter = getDateFilter(period as DatePeriod);

    // Get overall blog statistics
    const [blogStats] = await BlogPost.aggregate([
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

    // Get publishing activity over time
    const publishingActivity = await BlogPost.aggregate([
      {
        $match: {
          publishedAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$publishedAt' }
          },
          posts: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          posts: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Get author statistics
    const authorStats = await BlogPost.aggregate([
      {
        $group: {
          _id: '$author',
          totalPosts: { $sum: 1 },
          publishedPosts: { $sum: { $cond: ['$published', 1, 0] } },
          avgWordCount: {
            $avg: {
              $size: { $split: ['$content', ' '] }
            }
          },
          firstPost: { $min: '$date' },
          lastPost: { $max: '$date' },
        }
      },
      {
        $project: {
          author: '$_id',
          totalPosts: 1,
          publishedPosts: 1,
          avgWordCount: { $round: ['$avgWordCount', 0] },
          firstPost: 1,
          lastPost: 1,
          _id: 0,
        }
      },
      { $sort: { publishedPosts: -1 } }
    ]);

    // Get recent unpublished posts
    const unpublishedPosts = await BlogPost.find({ published: false })
      .select('title author date excerpt')
      .sort({ date: -1 })
      .limit(10)
      .lean();

    // Get recently published posts
    const recentlyPublished = await BlogPost.find({ published: true })
      .select('title author publishedAt excerpt')
      .sort({ publishedAt: -1 })
      .limit(10)
      .lean();

    // Fill in missing dates in publishing activity
    const filledActivity = fillMissingDates(
      publishingActivity,
      'date',
      dateFilter,
      new Date(),
      { posts: 0 }
    );

    // Aggregate by time unit if needed
    const activityData = timeUnit === 'day'
      ? filledActivity
      : aggregateByTimeUnit(filledActivity, 'date', timeUnit as 'week' | 'month', ['posts']);

    res.status(200).json({
      period,
      timeUnit,
      dateRange: formatDateRange(period as DatePeriod),
      description: getDateRangeDescription(period as DatePeriod),
      overview: blogStats || {
        totalPosts: 0,
        publishedPosts: 0,
        avgWordCount: 0,
        uniqueAuthors: 0,
      },
      publishingActivity,
      authorStats,
      unpublishedPosts,
      recentlyPublished,
    });
}

export default withAdminAuth(
  withErrorHandler(
    blogStatsHandler,
    'fetch',
    'Blog Statistics',
    'Error fetching blog statistics'
  )
);
