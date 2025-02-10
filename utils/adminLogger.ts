import { logSystemActivity } from './logActivity';

interface AdminLogOptions {
  action: string;
  subject: string;
  details?: string;
  adminName?: string;
  adminId?: string;
}

export async function logAdminAction({
  action,
  subject,
  details,
  adminName,
  adminId,
}: AdminLogOptions) {
  try {
    const adminInfo = adminName ? ` by ${adminName}` : '';
    const fullDetails = details ? `${details}${adminInfo}` : `Action performed${adminInfo}`;

    await logSystemActivity(
      'admin-action',
      subject,
      fullDetails
    );
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw error - logging failure shouldn't break the main functionality
  }
}

export async function logAdminError({
  action,
  subject,
  details,
  adminName,
  adminId,
}: AdminLogOptions) {
  try {
    const adminInfo = adminName ? ` (Admin: ${adminName})` : '';
    const fullDetails = details ? `${details}${adminInfo}` : `Error occurred${adminInfo}`;

    await logSystemActivity(
      'admin-error',
      subject,
      `Error during ${action}: ${fullDetails}`
    );
  } catch (error) {
    console.error('Error logging admin error:', error);
    // Don't throw error - logging failure shouldn't break the main functionality
  }
}

export async function logAdminAccess({
  action,
  subject,
  details,
  adminName,
  adminId,
}: AdminLogOptions) {
  try {
    const adminInfo = adminName ? ` by ${adminName}` : '';
    const fullDetails = details ? `${details}${adminInfo}` : `Access${adminInfo}`;

    await logSystemActivity(
      'admin-access',
      subject,
      `${action} access: ${fullDetails}`
    );
  } catch (error) {
    console.error('Error logging admin access:', error);
    // Don't throw error - logging failure shouldn't break the main functionality
  }
}

export async function logAdminBulkOperation({
  action,
  subject,
  details,
  adminName,
  adminId,
}: AdminLogOptions) {
  try {
    const adminInfo = adminName ? ` by ${adminName}` : '';
    const fullDetails = details ? `${details}${adminInfo}` : `Bulk operation performed${adminInfo}`;

    await logSystemActivity(
      'admin-bulk-operation',
      subject,
      `${action}: ${fullDetails}`
    );
  } catch (error) {
    console.error('Error logging admin bulk operation:', error);
    // Don't throw error - logging failure shouldn't break the main functionality
  }
}

// Example usage:
/*
await logAdminAction({
  action: 'update',
  subject: 'Product',
  details: 'Updated product stock levels',
  adminName: req.user?.name,
  adminId: req.user?._id.toString(),
});

await logAdminError({
  action: 'delete',
  subject: 'Order',
  details: 'Invalid order status',
  adminName: req.user?.name,
  adminId: req.user?._id.toString(),
});

await logAdminAccess({
  action: 'view',
  subject: 'Admin Dashboard',
  adminName: req.user?.name,
  adminId: req.user?._id.toString(),
});

await logAdminBulkOperation({
  action: 'update-status',
  subject: 'Orders',
  details: 'Marked 5 orders as shipped',
  adminName: req.user?.name,
  adminId: req.user?._id.toString(),
});
*/
