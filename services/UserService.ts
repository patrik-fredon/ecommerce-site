import { Document, Model, Types } from 'mongoose';
import { BaseService } from './BaseService';
import User, { IUser, IUserDocument } from '../models/User';
import { UserRole } from '../types/auth';
import { activityLogService } from './ActivityLogService';
import { ActivityType, ActivitySubject } from '../utils/adminActivity';

export interface CreateUserData extends Omit<IUser, 'createdAt' | 'updatedAt'> {}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isBlocked?: boolean;
}

class UserService extends BaseService<IUserDocument, CreateUserData> {
  constructor() {
    super(User);
  }

  // Find users with role filtering
  async findByRole(role: UserRole, options = {}) {
    return this.find(
      { role },
      { ...options, sort: { createdAt: -1 } }
    );
  }

  // Find active (non-blocked) users
  async findActive(options = {}) {
    return this.find(
      { isBlocked: false },
      { ...options, sort: { createdAt: -1 } }
    );
  }

  // Find blocked users
  async findBlocked(options = {}) {
    return this.find(
      { isBlocked: true },
      { ...options, sort: { createdAt: -1 } }
    );
  }

  // Find user by email (with optional password inclusion)
  async findByEmail(email: string, includePassword = false): Promise<IUserDocument | null> {
    const query = this.model.findOne({ email });
    if (includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  // Override create to handle password hashing
  override async create(data: CreateUserData): Promise<IUserDocument> {
    return super.create({
      ...data,
      isBlocked: false // Ensure new users start unblocked
    });
  }

  // Update user with activity logging
  async updateWithLog(
    id: string,
    data: UpdateUserData,
    actorId: string
  ): Promise<IUserDocument | null> {
    const user = await this.update(id, data);
    
    if (user) {
      // Log relevant changes
      const changes: string[] = [];
      if (data.role) changes.push(`role changed to ${data.role}`);
      if (data.isBlocked !== undefined) changes.push(`user ${data.isBlocked ? 'blocked' : 'unblocked'}`);
      if (data.email) changes.push('email updated');
      if (data.password) changes.push('password changed');
      if (data.name) changes.push('name updated');

      if (changes.length > 0) {
        await activityLogService.create({
          userId: actorId,
          action: ActivityType.USER_UPDATED,
          subject: ActivitySubject.USER,
          itemName: user.email,
          details: changes.join(', ')
        });
      }
    }

    return user;
  }

  // Block user
  async block(id: string, actorId: string): Promise<IUserDocument | null> {
    const user = await this.findById(id);
    if (!user) return null;

    await user.block();
    
    await activityLogService.create({
      userId: actorId,
      action: ActivityType.USER_BLOCKED,
      subject: ActivitySubject.USER,
      itemName: user.email
    });

    return user;
  }

  // Unblock user
  async unblock(id: string, actorId: string): Promise<IUserDocument | null> {
    const user = await this.findById(id);
    if (!user) return null;

    await user.unblock();
    
    await activityLogService.create({
      userId: actorId,
      action: ActivityType.USER_UNBLOCKED,
      subject: ActivitySubject.USER,
      itemName: user.email
    });

    return user;
  }

  // Change user role
  async changeRole(
    id: string,
    role: UserRole,
    actorId: string
  ): Promise<IUserDocument | null> {
    const user = await this.update(id, { role });
    
    if (user) {
      await activityLogService.create({
        userId: actorId,
        action: ActivityType.USER_UPDATED,
        subject: ActivitySubject.USER,
        itemName: user.email,
        details: `role changed to ${role}`
      });
    }

    return user;
  }

  // Get user statistics
  async getStats() {
    try {
      await this.ensureConnection();
      
      const [stats] = await this.model.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$isBlocked', false] }, 1, 0] }
            },
            blocked: {
              $sum: { $cond: [{ $eq: ['$isBlocked', true] }, 1, 0] }
            },
            admins: {
              $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
            },
            users: {
              $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            active: 1,
            blocked: 1,
            admins: 1,
            users: 1
          }
        }
      ]);

      return stats || {
        total: 0,
        active: 0,
        blocked: 0,
        admins: 0,
        users: 0
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const userService = new UserService();
