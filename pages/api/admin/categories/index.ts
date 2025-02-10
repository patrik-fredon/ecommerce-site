import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import Product from '../../../../models/Product';
import { logSystemActivity } from '../../../../utils/logActivity';

async function handler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        // Get all unique categories with their product counts
        const categories = await Product.aggregate([
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              inStock: {
                $sum: { $cond: [{ $gt: ['$stock', 0] }, 1, 0] }
              },
              avgPrice: { $avg: '$price' },
              featured: {
                $sum: { $cond: ['$featured', 1, 0] }
              },
            }
          },
          {
            $project: {
              _id: 0,
              name: '$_id',
              count: 1,
              inStock: 1,
              avgPrice: { $round: ['$avgPrice', 2] },
              featured: 1,
            }
          },
          { $sort: { count: -1 } }
        ]);

        res.status(200).json(categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
      }
      break;

    case 'PATCH':
      try {
        const { operation } = req.body;

        if (!operation) {
          return res.status(400).json({ message: 'Operation not specified' });
        }

        switch (operation) {
          case 'rename':
            const { oldName, newName } = req.body;
            if (!oldName || !newName) {
              return res.status(400).json({ message: 'Both old and new category names are required' });
            }

            const result = await Product.updateMany(
              { category: oldName },
              { $set: { category: newName } }
            );

            await logSystemActivity(
              'category-renamed',
              'Categories',
              `Category "${oldName}" renamed to "${newName}" by ${req.user?.name}`
            );

            return res.status(200).json({
              message: `Successfully renamed category. ${result.modifiedCount} products updated.`,
              modifiedCount: result.modifiedCount,
            });

          case 'merge':
            const { categories, targetCategory } = req.body;
            if (!Array.isArray(categories) || !targetCategory) {
              return res.status(400).json({ message: 'Invalid categories format' });
            }

            const mergeResult = await Product.updateMany(
              { category: { $in: categories } },
              { $set: { category: targetCategory } }
            );

            await logSystemActivity(
              'categories-merged',
              'Categories',
              `Categories [${categories.join(', ')}] merged into "${targetCategory}" by ${req.user?.name}`
            );

            return res.status(200).json({
              message: `Successfully merged categories. ${mergeResult.modifiedCount} products updated.`,
              modifiedCount: mergeResult.modifiedCount,
            });

          default:
            return res.status(400).json({ message: 'Invalid operation' });
        }
      } catch (error) {
        console.error('Error updating categories:', error);
        res.status(500).json({ message: 'Error updating categories' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PATCH']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default withAdminAuth(handler);
