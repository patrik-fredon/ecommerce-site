import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import ActivityLog, { IActivityLogDocument } from '../../../../models/ActivityLog';

async function handler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;
  const { limit = '10', type } = req.query;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const query = type ? { type } : {};
        const activities: IActivityLogDocument[] = await ActivityLog.find(query)
          .sort({ timestamp: -1 })
          .limit(Number(limit))
          .populate('userId', 'name email')
          .lean();

        // Transform dates to ISO strings for JSON response
        const formattedActivities = activities.map(activity => ({
          ...activity,
          timestamp: activity.timestamp.toISOString(),
          createdAt: activity.createdAt.toISOString(),
          updatedAt: activity.updatedAt.toISOString(),
        }));

        res.status(200).json(formattedActivities);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ message: 'Error fetching activity logs' });
      }
      break;

    case 'POST':
      try {
        const { type, action, subject, details, userId } = req.body;

        if (!type || !action || !subject) {
          return res.status(400).json({
            message: 'Missing required fields: type, action, and subject are required',
          });
        }

        const activity = await ActivityLog.logActivity(
          type,
          action,
          subject,
          details,
          userId
        );

        res.status(201).json(activity);
      } catch (error) {
        console.error('Error creating activity log:', error);
        res.status(500).json({ message: 'Error creating activity log' });
      }
      break;

    case 'DELETE':
      try {
        // Clean old logs (admin only)
        await ActivityLog.cleanOldLogs();
        res.status(200).json({ message: 'Old activity logs cleaned successfully' });
      } catch (error) {
        console.error('Error cleaning activity logs:', error);
        res.status(500).json({ message: 'Error cleaning activity logs' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default withAdminAuth(handler);
