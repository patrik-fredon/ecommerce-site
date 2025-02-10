import { PopulateOptions, Types } from 'mongoose';
import { BaseService } from './BaseService';
import Review from '../models/Review';
import { IReviewDocument } from '../types/models';
import { productService } from './ProductService';

export interface ReviewCreateData {
  product: string;
  user: string;
  rating: number;
  comment: string;
}

export interface ReviewUpdateData {
  comment?: string;
  rating?: number;
}

class ReviewService extends BaseService<IReviewDocument> {
  constructor() {
    super(Review);
  }

  async createReview(data: ReviewCreateData): Promise<IReviewDocument> {
    return this.withTransaction(async (session) => {
      const product = await productService.findById(data.product, { session });
      if (!product) {
        throw new Error('Product not found');
      }

      // Create review within transaction
      const review = await super.create({
        ...data,
        product: new Types.ObjectId(data.product),
        user: new Types.ObjectId(data.user)
      }, { session });

      // Update product rating within transaction
      const currentTotal = (product.rating || 0) * (product.reviewCount || 0);
      const newCount = (product.reviewCount || 0) + 1;
      const newRating = (currentTotal + data.rating) / newCount;

      await productService.update(data.product, {
        $inc: { reviewCount: 1 },
        $set: { rating: newRating }
      }, { session });

      return review;
    });
  }

  async updateReview(id: string, data: ReviewUpdateData): Promise<IReviewDocument | null> {
    return this.withTransaction(async (session) => {
      const review = await this.findById(id, { session });
      if (!review) {
        throw new Error('Review not found');
      }

      // If rating is being updated, we need to update the product's average rating
      if (data.rating && data.rating !== review.rating) {
        const product = await productService.findById(review.product.toString(), { session });
        if (!product) {
          throw new Error('Product not found');
        }

        const currentTotal = (product.rating || 0) * (product.reviewCount || 1);
        const totalWithoutOldRating = currentTotal - review.rating;
        const newRating = (totalWithoutOldRating + data.rating) / (product.reviewCount || 1);

        await productService.update(review.product.toString(), {
          $set: { rating: newRating }
        }, { session });
      }

      // Update the review within transaction
      return await super.update(id, {
        ...(data.rating && { rating: data.rating }),
        ...(data.comment && { comment: data.comment })
      }, { session });
    });
  }

  async deleteReview(id: string): Promise<IReviewDocument | null> {
    return this.withTransaction(async (session) => {
      const review = await this.findById(id, { session });
      if (!review) {
        throw new Error('Review not found');
      }

      const product = await productService.findById(review.product.toString(), { session });
      if (!product) {
        throw new Error('Product not found');
      }

      const currentCount = product.reviewCount || 1;
      if (currentCount === 1) {
        // This was the last review
        await productService.update(review.product.toString(), {
          $set: { rating: 0, reviewCount: 0 }
        }, { session });
      } else {
        // Recalculate average without this review
        const currentTotal = (product.rating || 0) * currentCount;
        const newRating = (currentTotal - review.rating) / (currentCount - 1);

        await productService.update(review.product.toString(), {
          $inc: { reviewCount: -1 },
          $set: { rating: newRating }
        }, { session });
      }

      // Delete the review within transaction
      return await this.delete(id, { session });
    });
  }

  async findByProduct(productId: string, options = {}) {
    const populateOptions: PopulateOptions = {
      path: 'user',
      select: 'name avatar'
    };

    return this.find(
      { product: new Types.ObjectId(productId) },
      { 
        ...options, 
        sort: { createdAt: -1 }, 
        populate: populateOptions 
      }
    );
  }

  async findByUser(userId: string, options = {}) {
    const populateOptions: PopulateOptions = {
      path: 'product',
      select: 'name image price'
    };

    return this.find(
      { user: new Types.ObjectId(userId) },
      { 
        ...options, 
        sort: { createdAt: -1 }, 
        populate: populateOptions 
      }
    );
  }

  async hasUserReviewed(userId: string, productId: string): Promise<boolean> {
    const review = await this.findOne({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(productId)
    });
    return !!review;
  }

  async getProductStats(productId: string) {
    const stats = await this.aggregate([
      { $match: { product: new Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (!stats.length) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        }
      };
    }

    const distribution = stats[0].ratingDistribution.reduce((acc: Record<number, number>, rating: number) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {});

    return {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
      ratingDistribution: {
        1: distribution[1] || 0,
        2: distribution[2] || 0,
        3: distribution[3] || 0,
        4: distribution[4] || 0,
        5: distribution[5] || 0
      }
    };
  }
}

export const reviewService = new ReviewService();
