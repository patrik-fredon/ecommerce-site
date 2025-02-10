import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import Order from '../../../../models/Order';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import {
  DatePeriod,
  getDateFilter,
  formatDateRange,
  getDateRangeDescription,
  fillMissingDates,
  aggregateByTimeUnit,
} from '../../../../utils/dateFilters';

async function orderStatsHandler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  await dbConnect();

    const { period = '30d', timeUnit = 'day' } = req.query;
    const dateFilter = getDateFilter(period as DatePeriod);

    // Get overall statistics
    const [overallStats] = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          totalItems: { $sum: { $size: '$items' } },
          uniqueCustomers: { $addToSet: '$userId' },
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          totalItems: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' },
        }
      }
    ]);

    // Get status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          revenue: { $round: ['$revenue', 2] },
          _id: 0
        }
      }
    ]);

    // Get daily revenue trend
    const dailyTrend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFilter },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          revenue: { $round: ['$revenue', 2] },
          orders: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Get payment method breakdown
    const paymentMethods = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      {
        $project: {
          method: '$_id',
          count: 1,
          revenue: { $round: ['$revenue', 2] },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top customers
    const topCustomers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          _id: 0,
          user: { $arrayElemAt: ['$user.name', 0] },
          email: { $arrayElemAt: ['$user.email', 0] },
          orderCount: 1,
          totalSpent: { $round: ['$totalSpent', 2] }
        }
      }
    ]);

    // Fill in missing dates in the daily trend
    const filledDailyTrend = fillMissingDates(
      dailyTrend,
      'date',
      dateFilter,
      new Date(),
      { revenue: 0, orders: 0 }
    );

    // Aggregate by time unit if needed
    const trendData = timeUnit === 'day' 
      ? filledDailyTrend 
      : aggregateByTimeUnit(filledDailyTrend, 'date', timeUnit as 'week' | 'month', ['revenue', 'orders']);

    res.status(200).json({
      period,
      timeUnit,
      dateRange: formatDateRange(period as DatePeriod),
      description: getDateRangeDescription(period as DatePeriod),
      overview: overallStats || {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        totalItems: 0,
        uniqueCustomers: 0,
      },
      statusBreakdown,
      dailyTrend,
      paymentMethods,
      topCustomers,
    });
}

export default withAdminAuth(
  withErrorHandler(
    orderStatsHandler,
    'fetch',
    'Order Statistics',
    'Error fetching order statistics'
  )
);
