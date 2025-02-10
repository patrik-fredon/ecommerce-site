import { NextApiRequest } from 'next';
import { Types } from 'mongoose';
import { ApiUser } from '../types/auth';
import { activityLogService } from '../services/ActivityLogService';
import { ActivityType, ActivitySubject, ACTIVITY_TYPES, ACTIVITY_SUBJECTS } from '../types/activity';

// Re-export types for backward compatibility
export { ActivityType, ActivitySubject, ACTIVITY_TYPES, ACTIVITY_SUBJECTS };

export interface ActivityLogData {
  userId: Types.ObjectId;
  action: ActivityType;
  subject: ActivitySubject;
  itemName: string;
  details?: string;
}

export interface ExtendedRequest extends Omit<NextApiRequest, 'user'> {
  user?: ApiUser;
}

export interface LogActivityOptions {
  req: ExtendedRequest;
  action: ActivityType;
  subject: ActivitySubject;
  itemName: string;
  details?: string;
}

export async function logModelActivity({
  req,
  action,
  subject,
  itemName,
  details,
}: LogActivityOptions): Promise<void> {
  if (!req.user?.id) {
    console.warn('No user ID found in request for activity logging');
    return;
  }

  try {
    await activityLogService.create({
      userId: new Types.ObjectId(req.user.id),
      action,
      subject,
      itemName,
      details,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export function getActivityDescription(
  action: ActivityType,
  subject: ActivitySubject,
  itemName?: string,
  details?: string
): string {
  const parts = [
    `${action} ${subject}`,
    itemName && `"${itemName}"`,
    details,
  ].filter(Boolean);

  return parts.join(' - ');
}

export function getActivityIcon(subject: ActivitySubject): { icon: string; bgColor: string } {
  switch (subject) {
    case ActivitySubject.USER:
      return { icon: '👤', bgColor: 'bg-blue-500' };
    case ActivitySubject.BLOG:
      return { icon: '📝', bgColor: 'bg-green-500' };
    case ActivitySubject.PRODUCT:
      return { icon: '📦', bgColor: 'bg-purple-500' };
    case ActivitySubject.SETTINGS:
      return { icon: '⚙️', bgColor: 'bg-gray-500' };
    case ActivitySubject.SYSTEM:
      return { icon: '🔧', bgColor: 'bg-yellow-500' };
    default:
      return { icon: '📋', bgColor: 'bg-gray-500' };
  }
}

export function getActivityColor(action: ActivityType): string {
  if (action.includes('CREATED')) {
    return 'text-green-600';
  }
  if (action.includes('UPDATED') || action.includes('LOGIN') || action.includes('INFO')) {
    return 'text-blue-600';
  }
  if (action.includes('DELETED') || action.includes('ERROR')) {
    return 'text-red-600';
  }
  if (action.includes('BLOCKED') || action.includes('WARNING')) {
    return 'text-yellow-600';
  }
  if (action.includes('UNBLOCKED')) {
    return 'text-green-600';
  }
  return 'text-gray-600';
}

export function getActivityVerb(action: ActivityType): string {
  const verb = action
    .split('_')
    .pop()!
    .toLowerCase()
    .replace(/ed$/, '')
    .replace(/d$/, '');

  // Special cases for system activities
  if (action.startsWith('SYSTEM_')) {
    return 'reported';
  }

  return verb;
}

export function formatActivityTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
}

export function isSystemActivity(action: ActivityType): boolean {
  return action.startsWith('SYSTEM_');
}

export function getSystemActivityLevel(action: ActivityType): 'error' | 'warning' | 'info' | null {
  if (action === ActivityType.SYSTEM_ERROR) return 'error';
  if (action === ActivityType.SYSTEM_WARNING) return 'warning';
  if (action === ActivityType.SYSTEM_INFO) return 'info';
  return null;
}
