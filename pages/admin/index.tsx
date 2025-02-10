import AdminLayout from '../../components/admin/AdminLayout';
import StatsOverview from '../../components/admin/StatsOverview';
import RecentActivity from '../../components/admin/RecentActivity';

export default function AdminDashboard() {

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <StatsOverview />
        
        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/admin/products/new'}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add New Product
            </button>
            <button
              onClick={() => window.location.href = '/admin/blog/new'}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Create Blog Post
            </button>
            <button
              onClick={() => window.location.href = '/admin/users'}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              Manage Users
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <RecentActivity />
        </div>
      </div>
    </AdminLayout>
  );
}
