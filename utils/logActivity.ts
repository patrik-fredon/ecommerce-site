type ActivityType = 'user' | 'product' | 'blog' | 'system';

export async function logActivity(
  type: ActivityType,
  action: string,
  subject: string,
  details?: string,
  userId?: string
) {
  try {
    const response = await fetch('/api/admin/activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        action,
        subject,
        details,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log activity');
    }

    return await response.json();
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error - logging failure shouldn't break the main functionality
    return null;
  }
}

// Helper functions for common activities
export const logUserActivity = (action: string, subject: string, details?: string, userId?: string) =>
  logActivity('user', action, subject, details, userId);

export const logProductActivity = (action: string, subject: string, details?: string, userId?: string) =>
  logActivity('product', action, subject, details, userId);

export const logBlogActivity = (action: string, subject: string, details?: string, userId?: string) =>
  logActivity('blog', action, subject, details, userId);

export const logSystemActivity = (action: string, subject: string, details?: string) =>
  logActivity('system', action, subject, details);

// Example usage:
// await logUserActivity('registered', 'New User', 'john.doe@example.com');
// await logProductActivity('created', 'Eco-Friendly Water Bottle', 'Added to featured products');
// await logBlogActivity('published', 'Sustainable Living Tips');
// await logSystemActivity('backup', 'Database Backup', 'Weekly automatic backup completed');
