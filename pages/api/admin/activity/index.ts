import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import ActivityLog from '../../../../models/ActivityLog';
import { withCache, CacheTags } from '../../../../utils/adminCache';

async function activityHandler(req: AuthRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    await dbConnect();

    // Get the latest 20 activities
    const activities = await ActivityLog.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'name email')
      .lean();

    res.status(200).json({
      activities,
      message: 'Activities retrieved successfully'
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching activities:', error);
    res.status(500).json({
      error: 'Failed to fetch activities',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withAdminAuth(
  withCache(activityHandler, {
    maxAge: 30, // Cache for 30 seconds
    tags: [CacheTags.STATS],
  })
);
