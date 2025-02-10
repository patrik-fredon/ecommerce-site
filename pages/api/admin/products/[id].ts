import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import Product from '../../../../models/Product';
import { logModelActivity } from '../../../../utils/adminActivity';
import { ActivityType, ActivitySubject } from '../../../../utils/adminActivity';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendMethodNotAllowed,
} from '../../../../utils/adminResponse';

async function productHandler(req: AuthRequest, res: NextApiResponse) {
  const {
    query: { id },
    method,
  } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const product = await Product.findById(id).lean();
        if (!product) {
          return sendNotFound(res, 'Product not found');
        }
        return sendSuccess(res, product);
      } catch (error) {
        throw error;
      }
      break;

    case 'PUT':
      try {
        const product = await Product.findByIdAndUpdate(
          id,
          { $set: req.body },
          { new: true, runValidators: true }
        );

        if (!product) {
          return sendNotFound(res, 'Product not found');
        }

        await logModelActivity({
          req,
          action: ActivityType.PRODUCT_UPDATED,
          subject: ActivitySubject.PRODUCT,
          itemName: product.name,
        });

        return sendSuccess(res, product, 'Product updated successfully');
      } catch (error) {
        throw error;
      }
      break;

    case 'DELETE':
      try {
        const product = await Product.findByIdAndDelete(id);
        if (!product) {
          return sendNotFound(res, 'Product not found');
        }

        await logModelActivity({
          req,
          action: ActivityType.PRODUCT_DELETED,
          subject: ActivitySubject.PRODUCT,
          itemName: product.name,
        });

        return sendSuccess(res, null, 'Product deleted successfully');
      } catch (error) {
        throw error;
      }
      break;

    case 'PATCH':
      try {
        const { operation } = req.body;

        if (!operation) {
          return sendBadRequest(res, 'Operation not specified');
        }

        let product;
        switch (operation) {
          case 'toggle-featured':
            product = await Product.findByIdAndUpdate(
              id,
              [{ $set: { featured: { $not: '$featured' } } }],
              { new: true }
            );

            if (!product) {
              return sendNotFound(res, 'Product not found');
            }

            await logModelActivity({
              req,
              action: product.featured ? ActivityType.PRODUCT_FEATURED : ActivityType.PRODUCT_UNFEATURED,
              subject: ActivitySubject.PRODUCT,
              itemName: product.name,
            });

            return sendSuccess(res, product);

          case 'update-stock':
            const { quantity } = req.body;
            if (typeof quantity !== 'number') {
              return sendBadRequest(res, 'Invalid quantity');
            }

            product = await Product.findByIdAndUpdate(
              id,
              { $inc: { stock: quantity } },
              { new: true }
            );

            if (!product) {
              return sendNotFound(res, 'Product not found');
            }

            await logModelActivity({
              req,
              action: ActivityType.PRODUCT_STOCK_UPDATED,
              subject: ActivitySubject.PRODUCT,
              itemName: product.name,
              details: `Stock ${quantity >= 0 ? 'increased' : 'decreased'} by ${Math.abs(quantity)} units`,
            });

            return sendSuccess(res, product);

          default:
            return sendBadRequest(res, 'Invalid operation');
        }
      } catch (error) {
        throw error;
      }
      break;

    default:
      return sendMethodNotAllowed(res, ['GET', 'PUT', 'DELETE', 'PATCH']);
  }
}

export default withAdminAuth(
  withErrorHandler(
    productHandler,
    'manage',
    'Product',
    'Error managing product'
  )
);
