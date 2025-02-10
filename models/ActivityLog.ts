import mongoose, { Document, Schema, Model } from 'mongoose';
import { ActivityType, ActivitySubject } from '../types/activity';

export interface IActivityLog {
  userId: mongoose.Types.ObjectId;
  action: ActivityType;
  subject: ActivitySubject;
  itemName: string;
  details?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IActivityLogDocument extends IActivityLog, Document {}

const ActivityLogSchema = new Schema<IActivityLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: Object.values(ActivityType),
      index: true,
    },
    subject: {
      type: String,
      required: true,
      enum: Object.values(ActivitySubject),
      index: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    details: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ subject: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });

// Add virtual fields
ActivityLogSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Configure toJSON transform
ActivityLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

// Configure toObject transform
ActivityLogSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export default mongoose.models.ActivityLog as Model<IActivityLogDocument> || 
  mongoose.model<IActivityLogDocument>('ActivityLog', ActivityLogSchema);
