import { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import BlogPostModal from '../../../components/admin/BlogPostModal';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { BlogPost } from '../../../utils/types';
import { blogPosts as sampleBlogPosts } from '../../../utils/sampleData';

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>(sampleBlogPosts);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const handleEdit = (post: BlogPost) => {
    setSelectedPost(post);
    setShowEditModal(true);
  };

  const handleDelete = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        // TODO: Implement API call to delete blog post
        setPosts(posts.filter((p) => p.id !== postId));
      } catch (error) {
        console.error('Error deleting blog post:', error);
        alert('Failed to delete blog post');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout title="Blog Management">
      <div className="mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          Add Blog Post
        </button>
      </div>

      {/* Blog Posts Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Title
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Author
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded object-cover"
                          src={post.image}
                          alt=""
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {post.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {post.excerpt}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{post.author}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(post.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(post)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                      title="Edit blog post"
                      aria-label={`Edit ${post.title}`}
                    >
                      <PencilIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete blog post"
                      aria-label={`Delete ${post.title}`}
                    >
                      <TrashIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Blog Post Modal */}
      <BlogPostModal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedPost(null);
        }}
        onSubmit={async (postData) => {
          try {
            if (showAddModal) {
              // TODO: Implement API call to add blog post
              const newPost = {
                ...postData,
                id: Date.now().toString(),
              } as BlogPost;
              setPosts([...posts, newPost]);
            } else {
              // TODO: Implement API call to update blog post
              setPosts(
                posts.map((p) =>
                  p.id === selectedPost?.id ? { ...p, ...postData } : p
                )
              );
            }
            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedPost(null);
          } catch (error) {
            console.error('Error saving blog post:', error);
            alert('Failed to save blog post');
          }
        }}
        post={selectedPost}
        mode={showAddModal ? 'add' : 'edit'}
      />
    </AdminLayout>
  );
}
