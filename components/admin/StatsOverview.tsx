import { useEffect, useState } from 'react';
import {
  UsersIcon,
  ShoppingBagIcon,
  NewspaperIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface Stats {
  users: {
    total: number;
    newLastWeek: number;
  };
  products: {
    total: number;
    featured: number;
  };
  blogPosts: {
    total: number;
    thisMonth: number;
  };
  categories: {
    name: string;
    count: number;
  }[];
}

export default function StatsOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const mainStats = [
    {
      name: 'Total Users',
      value: stats.users.total,
      change: `${stats.users.newLastWeek} new this week`,
      changeType: 'increase',
      icon: UsersIcon,
    },
    {
      name: 'Products',
      value: stats.products.total,
      change: `${stats.products.featured} featured`,
      changeType: 'neutral',
      icon: ShoppingBagIcon,
    },
    {
      name: 'Blog Posts',
      value: stats.blogPosts.total,
      change: `${stats.blogPosts.thisMonth} this month`,
      changeType: 'increase',
      icon: NewspaperIcon,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mainStats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon
                    className="h-6 w-6 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value.toLocaleString()}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold">
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Categories Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Top Product Categories
        </h3>
        <div className="space-y-4">
          {stats.categories.map((category) => (
            <div key={category.name} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">
                  {category.name}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {category.count} products
                </span>
              </div>
              <div className="overflow-hidden h-2 bg-gray-200 rounded">
                <div
                  className="h-2 bg-blue-500 rounded"
                  style={{
                    width: `${(category.count / stats.products.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
