import { useEffect, useState } from 'react';
import {
  UserIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  type: 'user' | 'product' | 'blog' | 'system';
  action: string;
  subject: string;
  timestamp: string;
  details?: string;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/admin/activity?limit=10');
        if (!response.ok) throw new Error('Failed to fetch activities');
        const data = await response.json();
        setActivities(data.map((activity: any) => ({
          id: activity._id,
          type: activity.type,
          action: activity.action,
          subject: activity.subject,
          timestamp: activity.timestamp,
          details: activity.details,
        })));
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(err instanceof Error ? err.message : 'Error fetching activities');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();

    // Set up auto-refresh every minute
    const intervalId = setInterval(fetchActivities, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'user':
        return UserIcon;
      case 'product':
        return ShoppingCartIcon;
      case 'blog':
        return DocumentTextIcon;
      case 'system':
        return ExclamationCircleIcon;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(timestamp).getTime()) / 1000
    );

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    return Math.floor(seconds) + ' seconds ago';
  };

  if (error) {
    return (
      <div className="text-center py-6 text-red-600">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No recent activity to display
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, index) => {
          const Icon = getIcon(activity.type);
          return (
            <li key={activity.id}>
              <div className="relative pb-8">
                {index < activities.length - 1 && (
                  <span
                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                      <Icon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {activity.subject}
                        </span>{' '}
                        <span className="text-gray-500">{activity.action}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {getTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                    {activity.details && (
                      <div className="mt-2 text-sm text-gray-700">
                        {activity.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
