import React, { useEffect, useState } from 'react';
import { ActivityType, ActivitySubject, getActivityIcon, getActivityColor, formatActivityTimestamp } from '../../utils/adminActivity';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Activity {
  id: string;
  userId: string;
  user?: User;
  action: ActivityType;
  subject: ActivitySubject;
  itemName: string;
  details?: string;
  createdAt: string;
}

interface ActivityStats {
  last24Hours: number;
  last7Days: number;
  last30Days: number;
  total: number;
}

interface ActivityResponse {
  activities: Activity[];
  stats?: ActivityStats;
  timeline?: Array<{ date: string; count: number }>;
  subjectCounts?: Array<{ subject: ActivitySubject; count: number }>;
}

const RecentActivity: React.FC = () => {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/activity?stats=true&timeline=true&subjectCounts=true', {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error?.message || 'Failed to fetch activities');
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {data.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Last 24 Hours</h3>
            <p className="mt-2 text-3xl font-semibold">{data.stats.last24Hours}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Last 7 Days</h3>
            <p className="mt-2 text-3xl font-semibold">{data.stats.last7Days}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Last 30 Days</h3>
            <p className="mt-2 text-3xl font-semibold">{data.stats.last30Days}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total</h3>
            <p className="mt-2 text-3xl font-semibold">{data.stats.total}</p>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <div className="mt-6 flow-root">
            <ul className="-mb-8">
              {data.activities.map((activity, activityIdx) => {
                const { icon, bgColor } = getActivityIcon(activity.subject);
                const textColor = getActivityColor(activity.action);
                
                return (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== data.activities.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full ${bgColor} flex items-center justify-center ring-8 ring-white`}>
                            <span className="text-white text-sm">{icon}</span>
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">
                                {activity.user?.name || 'Unknown User'}
                              </span>{' '}
                              <span className={textColor}>
                                {activity.action.toLowerCase().replace('_', ' ')}
                              </span>{' '}
                              {activity.subject.toLowerCase()}{' '}
                              <span className="font-medium text-gray-900">{activity.itemName}</span>
                            </p>
                            {activity.details && (
                              <p className="mt-1 text-sm text-gray-500">{activity.details}</p>
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            <time dateTime={activity.createdAt}>
                              {formatActivityTimestamp(new Date(activity.createdAt))}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Subject Distribution */}
      {data.subjectCounts && data.stats && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Activity by Subject</h3>
            <div className="mt-6">
              {data.subjectCounts.map(({ subject, count }) => {
                const { bgColor } = getActivityIcon(subject);
                const percentage = (count / data.stats!.total) * 100;
                
                return (
                  <div key={subject} className="mt-4">
                    <div className="flex justify-between text-sm font-medium text-gray-900">
                      <span>{subject}</span>
                      <span>{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="mt-1">
                      <div className="overflow-hidden bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-full ${bgColor} rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
