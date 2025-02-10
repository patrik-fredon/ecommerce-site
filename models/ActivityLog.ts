import mongoose from 'mongoose';

interface IActivityLogDocument extends mongoose.Document {
  type: 'user' | 'product' | 'blog' | 'system';
  action: string;
  subject: string;
  details?: string;
  userId?: mongoose.Types.ObjectId;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IActivityLogModel extends mongoose.Model<IActivityLogDocument> {
  logActivity(
    type: 'user' | 'product' | 'blog' | 'system',
    action: string,
    subject: string,
    details?: string,
    userId?: string
  ): Promise<IActivityLogDocument>;
  cleanOldLogs(): Promise<mongoose.mongo.DeleteResult>;
}

const activityLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['user', 'product', 'blog', 'system'],
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Add indexes for efficient querying
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ type: 1, timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function(
  type: IActivityLogDocument['type'],
  action: string,
  subject: string,
  details?: string,
  userId?: string
) {
  return this.create({
    type,
    action,
    subject,
    details,
    userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    timestamp: new Date(),
  });
};

// Method to clean old logs (keep last 30 days)
activityLogSchema.statics.cleanOldLogs = async function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.deleteMany({
    timestamp: { $lt: thirtyDaysAgo },
  });
};

const ActivityLog = (mongoose.models.ActivityLog as IActivityLogModel) || 
  mongoose.model<IActivityLogDocument, IActivityLogModel>('ActivityLog', activityLogSchema);

export type { IActivityLogDocument, IActivityLogModel };
export default ActivityLog;
