import { AuthRequest } from '../types/auth';
import { logAdminAction, logAdminBulkOperation } from './adminLogger';

interface ActivityOptions {
  req: AuthRequest;
  action: string;
  subject: string;
  details?: string;
  count?: number;
  itemName?: string;
}

export async function logModelActivity({
  req,
  action,
  subject,
  details,
  itemName,
}: ActivityOptions) {
  const user = req.user;
  const itemInfo = itemName ? ` "${itemName}"` : '';
  const fullDetails = details || `${subject}${itemInfo} ${action} by ${user?.name || 'Unknown'}`;

  await logAdminAction({
    action,
    subject,
    details: fullDetails,
    adminName: user?.name,
    adminId: user?._id?.toString(),
  });
}

export async function logBulkActivity({
  req,
  action,
  subject,
  details,
  count = 0,
}: ActivityOptions) {
  const user = req.user;
  const countInfo = count > 0 ? ` ${count} items` : '';
  const fullDetails = details || `${subject}${countInfo} ${action} by ${user?.name || 'Unknown'}`;

  await logAdminBulkOperation({
    action,
    subject,
    details: fullDetails,
    adminName: user?.name,
    adminId: user?._id?.toString(),
  });
}

// Example usage:
/*
// For single item operations
await logModelActivity({
  req,
  action: 'updated',
  subject: 'Product',
  itemName: product.name,
  details: `Stock updated to ${newStock}`,
});

// For bulk operations
await logBulkActivity({
  req,
  action: 'status-updated',
  subject: 'Orders',
  count: orderIds.length,
  details: `Marked as "${status}"`,
});
*/

// Common activity types
export const ActivityType = {
  // Product activities
  PRODUCT_CREATED: 'created',
  PRODUCT_UPDATED: 'updated',
  PRODUCT_DELETED: 'deleted',
  PRODUCT_FEATURED: 'featured',
  PRODUCT_UNFEATURED: 'unfeatured',
  PRODUCT_STOCK_UPDATED: 'stock-updated',

  // Order activities
  ORDER_STATUS_UPDATED: 'status-updated',
  ORDER_PAYMENT_UPDATED: 'payment-updated',
  ORDER_CANCELLED: 'cancelled',
  ORDER_NOTE_ADDED: 'note-added',

  // Blog activities
  BLOG_CREATED: 'created',
  BLOG_UPDATED: 'updated',
  BLOG_DELETED: 'deleted',
  BLOG_PUBLISHED: 'published',
  BLOG_UNPUBLISHED: 'unpublished',

  // User activities
  USER_CREATED: 'created',
  USER_UPDATED: 'updated',
  USER_DELETED: 'deleted',
  USER_BLOCKED: 'blocked',
  USER_UNBLOCKED: 'unblocked',
  USER_ROLE_UPDATED: 'role-updated',

  // Category activities
  CATEGORY_CREATED: 'created',
  CATEGORY_UPDATED: 'updated',
  CATEGORY_DELETED: 'deleted',
  CATEGORY_MERGED: 'merged',

  // Bulk operations
  BULK_UPDATE: 'bulk-update',
  BULK_DELETE: 'bulk-delete',
  BULK_STATUS_UPDATE: 'bulk-status-update',
  BULK_FEATURE: 'bulk-feature',
  BULK_UNFEATURE: 'bulk-unfeature',
  BULK_PUBLISH: 'bulk-publish',
  BULK_UNPUBLISH: 'bulk-unpublish',
  BULK_BLOCK: 'bulk-block',
  BULK_UNBLOCK: 'bulk-unblock',

  // System activities
  SETTINGS_UPDATED: 'settings-updated',
  CONFIG_UPDATED: 'config-updated',
  MAINTENANCE_PERFORMED: 'maintenance',
  BACKUP_CREATED: 'backup-created',
  RESTORE_PERFORMED: 'restore-performed',
} as const;

// Common subjects
export const ActivitySubject = {
  PRODUCT: 'Product',
  ORDER: 'Order',
  BLOG: 'Blog Post',
  USER: 'User',
  CATEGORY: 'Category',
  SYSTEM: 'System',
  SETTINGS: 'Settings',
  CONFIG: 'Configuration',
  MAINTENANCE: 'Maintenance',
  BACKUP: 'Backup',
} as const;
