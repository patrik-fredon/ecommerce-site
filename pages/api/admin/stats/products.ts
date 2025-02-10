import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import Product from '../../../../models/Product';
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

async function productStatsHandler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  await dbConnect();

    const { period = '30d', timeUnit = 'day' } = req.query;
    const dateFilter = getDateFilter(period as DatePeriod);

    // Get overall product statistics with time filter for stock updates
    const [productStats] = await Product.aggregate([
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalInStock: { $sum: { $cond: [{ $gt: ['$stock', 0] }, 1, 0] } },
                totalFeatured: { $sum: { $cond: ['$featured', 1, 0] } },
                avgPrice: { $avg: '$price' },
                totalStock: { $sum: '$stock' },
              }
            }
          ],
          recentUpdates: [
            {
              $match: {
                lastStockUpdate: { $gte: dateFilter }
              }
            },
            {
              $group: {
                _id: null,
                updatedProducts: { $sum: 1 },
                avgStockChange: { $avg: '$stock' }
              }
            }
          ]
        }
      },
      {
        $project: {
          _id: 0,
          totalProducts: { $arrayElemAt: ['$overall.totalProducts', 0] },
          totalInStock: { $arrayElemAt: ['$overall.totalInStock', 0] },
          totalFeatured: { $arrayElemAt: ['$overall.totalFeatured', 0] },
          avgPrice: { $round: [{ $arrayElemAt: ['$overall.avgPrice', 0] }, 2] },
          totalStock: { $arrayElemAt: ['$overall.totalStock', 0] },
          updatedProducts: { $arrayElemAt: ['$recentUpdates.updatedProducts', 0] },
          avgStockChange: { $round: [{ $arrayElemAt: ['$recentUpdates.avgStockChange', 0] }, 2] },
        }
      }
    ]);

    // Get category breakdown
    const categoryBreakdown = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          inStock: { $sum: { $cond: [{ $gt: ['$stock', 0] }, 1, 0] } },
          avgPrice: { $avg: '$price' },
          totalStock: { $sum: '$stock' },
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          inStock: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          totalStock: 1,
          _id: 0,
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get price range distribution
    const priceRanges = await Product.aggregate([
      {
        $bucket: {
          groupBy: '$price',
          boundaries: [0, 10, 25, 50, 100, 250, 500, 1000],
          default: '1000+',
          output: {
            count: { $sum: 1 },
            avgStock: { $avg: '$stock' },
            products: { $push: { id: '$_id', name: '$name', price: '$price' } }
          }
        }
      }
    ]);

    // Get low stock products
    const lowStockProducts = await Product.find({ stock: { $lte: 10 } })
      .select('name stock sku category lastStockUpdate')
      .sort({ stock: 1 })
      .limit(10)
      .lean();

    // Get top selling products (from orders)
    const topSelling = await Order.aggregate([
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $project: {
          _id: 0,
          product: { $arrayElemAt: ['$product.name', 0] },
          sku: { $arrayElemAt: ['$product.sku', 0] },
          category: { $arrayElemAt: ['$product.category', 0] },
          totalSold: 1,
          revenue: { $round: ['$revenue', 2] }
        }
      }
    ]);

    // Get stock movement history (products with recent stock updates)
    const recentStockUpdates = await Product.find({ lastStockUpdate: { $exists: true } })
      .select('name stock sku category lastStockUpdate')
      .sort({ lastStockUpdate: -1 })
      .limit(10)
      .lean();

    // Get stock movement history with time aggregation
    const stockMovements = await Product.aggregate([
      {
        $match: {
          lastStockUpdate: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$lastStockUpdate' }
          },
          products: { $sum: 1 },
          totalStock: { $sum: '$stock' }
        }
      },
      {
        $project: {
          date: '$_id',
          products: 1,
          totalStock: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Fill in missing dates and aggregate by time unit
    const filledMovements = fillMissingDates(
      stockMovements,
      'date',
      dateFilter,
      new Date(),
      { products: 0, totalStock: 0 }
    );

    const movementData = timeUnit === 'day'
      ? filledMovements
      : aggregateByTimeUnit(filledMovements, 'date', timeUnit as 'week' | 'month', ['products', 'totalStock']);

    res.status(200).json({
      period,
      timeUnit,
      dateRange: formatDateRange(period as DatePeriod),
      description: getDateRangeDescription(period as DatePeriod),
      overview: productStats || {
        updatedProducts: 0,
        avgStockChange: 0,
        totalProducts: 0,
        totalInStock: 0,
        totalFeatured: 0,
        avgPrice: 0,
        totalStock: 0,
      },
      categoryBreakdown,
      priceRanges,
      lowStockProducts,
      topSelling,
      recentStockUpdates,
      stockMovements: {
        data: movementData,
        total: stockMovements.reduce((sum, day) => sum + day.products, 0),
        stockChange: stockMovements.reduce((sum, day) => sum + day.totalStock, 0),
      },
    });
}

export default withAdminAuth(
  withErrorHandler(
    productStatsHandler,
    'fetch',
    'Product Statistics',
    'Error fetching product statistics'
  )
);
