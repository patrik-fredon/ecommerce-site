import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';
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

async function userStatsHandler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  await dbConnect();

    const { period = '30d', timeUnit = 'day' } = req.query;
    const dateFilter = getDateFilter(period as DatePeriod);

    // Get overall user statistics
    const [userStats] = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: [{ $not: ['$isBlocked'] }, 1, 0] } },
          blockedUsers: { $sum: { $cond: ['$isBlocked', 1, 0] } },
          admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          activeUsers: 1,
          blockedUsers: 1,
          admins: 1,
        }
      }
    ]);

    // Get user registration trend
    const registrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          users: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          users: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Get user engagement metrics (from orders)
    const userEngagement = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          lastOrder: { $max: '$createdAt' }
        }
      },
      {
        $group: {
          _id: null,
          activeCustomers: { $sum: 1 },
          totalOrders: { $sum: '$orderCount' },
          avgOrdersPerCustomer: { $avg: '$orderCount' },
          avgCustomerSpend: { $avg: '$totalSpent' },
          totalRevenue: { $sum: '$totalSpent' }
        }
      },
      {
        $project: {
          _id: 0,
          activeCustomers: 1,
          totalOrders: 1,
          avgOrdersPerCustomer: { $round: ['$avgOrdersPerCustomer', 2] },
          avgCustomerSpend: { $round: ['$avgCustomerSpend', 2] },
          totalRevenue: { $round: ['$totalRevenue', 2] }
        }
      }
    ]);

    // Get recently registered users
    const recentUsers = await User.find()
      .select('name email createdAt isBlocked')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get most active users (by order count)
    const mostActive = await Order.aggregate([
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrder: { $max: '$createdAt' }
        }
      },
      {
        $sort: { orderCount: -1 }
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
          name: { $arrayElemAt: ['$user.name', 0] },
          email: { $arrayElemAt: ['$user.email', 0] },
          orderCount: 1,
          totalSpent: { $round: ['$totalSpent', 2] },
          lastOrder: 1
        }
      }
    ]);

    // Fill in missing dates in registration trend
    const filledTrend = fillMissingDates(
      registrationTrend,
      'date',
      dateFilter,
      new Date(),
      { users: 0 }
    );

    // Aggregate by time unit if needed
    const trendData = timeUnit === 'day'
      ? filledTrend
      : aggregateByTimeUnit(filledTrend, 'date', timeUnit as 'week' | 'month', ['users']);

    res.status(200).json({
      period,
      timeUnit,
      dateRange: formatDateRange(period as DatePeriod),
      description: getDateRangeDescription(period as DatePeriod),
      overview: userStats || {
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        admins: 0,
      },
      registrationTrend,
      engagement: userEngagement[0] || {
        activeCustomers: 0,
        totalOrders: 0,
        avgOrdersPerCustomer: 0,
        avgCustomerSpend: 0,
        totalRevenue: 0,
      },
      recentUsers,
      mostActive,
    });
}

export default withAdminAuth(
  withErrorHandler(
    userStatsHandler,
    'fetch',
    'User Statistics',
    'Error fetching user statistics'
  )
);
