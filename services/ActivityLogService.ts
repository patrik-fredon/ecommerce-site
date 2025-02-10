import { BaseService } from './BaseService';
import ActivityLog, { IActivityLogDocument } from '../models/ActivityLog';
import { ActivityType, ActivitySubject } from '../types/activity';

export interface ActivityRange {
  last24Hours: number;
  last7Days: number;
  last30Days: number;
  total: number;
}

export interface CreateActivityLogData {
  userId: string;
  action: ActivityType;
  subject: ActivitySubject;
  itemName: string;
  details?: string;
}

class ActivityLogService extends BaseService<IActivityLogDocument> {
  constructor() {
    super(ActivityLog);
  }

  async findRecent(limit = 20) {
    return this.find(
      {},
      {
        limit,
        sort: { createdAt: -1 },
        populate: {
          path: 'userId',
          select: '-password',
          model: 'User'
        }
      }
    );
  }

  async findByUser(userId: string, options = {}) {
    return this.find(
      { userId },
      {
        ...options,
        sort: { createdAt: -1 },
        populate: {
          path: 'userId',
          select: '-password',
          model: 'User'
        }
      }
    );
  }

  async findBySubject(subject: ActivitySubject, options = {}) {
    return this.find(
      { subject },
      {
        ...options,
        sort: { createdAt: -1 },
        populate: {
          path: 'userId',
          select: '-password',
          model: 'User'
        }
      }
    );
  }

  async getActivityStats(): Promise<ActivityRange> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [stats] = await this.aggregate([
      {
        $facet: {
          last24Hours: [
            { $match: { createdAt: { $gte: last24Hours } } },
            { $count: 'count' }
          ],
          last7Days: [
            { $match: { createdAt: { $gte: last7Days } } },
            { $count: 'count' }
          ],
          last30Days: [
            { $match: { createdAt: { $gte: last30Days } } },
            { $count: 'count' }
          ],
          total: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    return {
      last24Hours: stats.last24Hours[0]?.count || 0,
      last7Days: stats.last7Days[0]?.count || 0,
      last30Days: stats.last30Days[0]?.count || 0,
      total: stats.total[0]?.count || 0
    };
  }

  async getActivityCountsBySubject() {
    return this.aggregate([
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          subject: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  }

  async getActivityTimeline(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);
  }
}

export const activityLogService = new ActivityLogService();
