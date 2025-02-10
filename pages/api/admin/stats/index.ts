import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';
import Product from '../../../../models/Product';
import BlogPost from '../../../../models/BlogPost';

interface Stats {
  users: {
    total: number;
    newLastWeek: number;
  };
  products: {
    total: number;
    featured: number;
  };
  blogPosts: {
    total: number;
    thisMonth: number;
  };
  categories: {
    name: string;
    count: number;
  }[];
}

async function handler(req: AuthRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await dbConnect();

    // Get date for last week and this month
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setDate(1);

    // Gather all stats concurrently
    const [
      totalUsers,
      newUsers,
      totalProducts,
      featuredProducts,
      totalPosts,
      recentPosts,
      categories
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: lastWeek } }),
      Product.countDocuments(),
      Product.countDocuments({ featured: true }),
      BlogPost.countDocuments(),
      BlogPost.countDocuments({ date: { $gte: thisMonth } }),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const stats: Stats = {
      users: {
        total: totalUsers,
        newLastWeek: newUsers,
      },
      products: {
        total: totalProducts,
        featured: featuredProducts,
      },
      blogPosts: {
        total: totalPosts,
        thisMonth: recentPosts,
      },
      categories: categories.map(cat => ({
        name: cat._id,
        count: cat.count,
      })),
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching admin statistics' });
  }
}

export default withAdminAuth(handler);
