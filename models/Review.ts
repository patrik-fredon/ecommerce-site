import mongoose, { Model } from 'mongoose';
import { IReview, IReviewDocument, IReviewModel } from '../types/models';

type ReviewModelType = Model<IReviewDocument> & IReviewModel;

const reviewSchema = new mongoose.Schema<IReviewDocument>({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    maxlength: [500, 'Comment cannot be more than 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

// Pre middleware to populate product and user references
reviewSchema.pre(/^find/, function(this: any, next) {
  if (this.populate) {
    this.populate({
      path: 'user',
      select: 'name avatar'
    })
    .populate({
      path: 'product',
      select: 'name image'
    });
  }
  next();
});

// Static methods
reviewSchema.statics.findByProduct = function(productId) {
  return this.find({ product: productId })
    .sort({ createdAt: -1 })
    .populate('user', 'name avatar')
    .exec();
};

reviewSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('product', 'name image price')
    .exec();
};

const Review = (mongoose.models.Review as ReviewModelType) || 
  mongoose.model<IReviewDocument, ReviewModelType>('Review', reviewSchema);

export default Review;
