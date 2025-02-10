import mongoose from 'mongoose';

export interface IActivityLog {
  userId: mongoose.Types.ObjectId;
  action: string;
  subject: string;
  itemName?: string;
  details?: string;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new mongoose.Schema<IActivityLog>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    itemName: {
      type: String,
    },
    details: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ subject: 1, createdAt: -1 });

// Ensure model isn't recreated if it already exists
export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
