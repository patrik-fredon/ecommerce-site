import { NextApiResponse } from 'next';
import { Types } from 'mongoose';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import { activityLogService } from '../../../../services/ActivityLogService';
import { withAuthCache, CacheTags, CacheConfigs } from '../../../../utils/cache/adminCache';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import { validateRequestAndSendError } from '../../../../utils/adminValidation';
import { ActivityValidators } from '../../../../utils/adminValidators';
import { sendSuccess, sendMethodNotAllowed } from '../../../../utils/adminResponse';

async function handler(req: AuthRequest, res: NextApiResponse): Promise<void | NextApiResponse> {
  switch (req.method) {
    case 'GET': {
      const { 
        limit = '20',
        stats = 'false',
        timeline = 'false',
        subjectCounts = 'false',
        timelineDays = '30'
      } = req.query;

      // Parse query parameters
      const parsedLimit = Math.min(Math.max(1, parseInt(limit as string, 10)), 100);
      const parsedTimelineDays = Math.min(Math.max(1, parseInt(timelineDays as string, 10)), 365);
      const shouldGetStats = stats === 'true';
      const shouldGetTimeline = timeline === 'true';
      const shouldGetSubjectCounts = subjectCounts === 'true';

      // Fetch activities and optional statistics concurrently
      const [activities, statsData, timelineData, subjectCountsData] = await Promise.all([
        activityLogService.findRecent(parsedLimit),
        shouldGetStats ? activityLogService.getActivityStats() : null,
        shouldGetTimeline ? activityLogService.getActivityTimeline(parsedTimelineDays) : null,
        shouldGetSubjectCounts ? activityLogService.getActivityCountsBySubject() : null,
      ]);

      // Build response data
      const responseData = {
        activities,
        ...(shouldGetStats && { stats: statsData }),
        ...(shouldGetTimeline && { timeline: timelineData }),
        ...(shouldGetSubjectCounts && { subjectCounts: subjectCountsData }),
      };

      return sendSuccess(res, responseData, 'Activities retrieved successfully');
    }

    case 'POST': {
      // Validate request body
      const validation = validateRequestAndSendError(
        req,
        res,
        [
          ActivityValidators.action,
          ActivityValidators.subject,
          ActivityValidators.itemName,
          ActivityValidators.details,
        ],
        { source: 'body' }
      );

      if (validation) {
        return validation;
      }

      // Create activity log
      const activity = await activityLogService.create({
        userId: new Types.ObjectId(req.user!.id),
        action: req.body.action,
        subject: req.body.subject,
        itemName: req.body.itemName,
        details: req.body.details,
      });

      return sendSuccess(res, activity, 'Activity logged successfully', undefined, 201);
    }

    default:
      return sendMethodNotAllowed(res, ['GET', 'POST']);
  }
}

export default withAdminAuth(
  withAuthCache(
    withErrorHandler(handler, 'manage', 'Activity Log', 'Error managing activity logs'),
    {
      ...CacheConfigs.shortTerm,
      tags: [CacheTags.ACTIVITY]
    }
  )
);
