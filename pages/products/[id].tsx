import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { products } from '../../utils/sampleData';
import { StarIcon } from '@heroicons/react/20/solid';
import Image from 'next/image';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Product not found</h1>
            <p className="mt-2 text-gray-600">The product you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/products')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Products
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {/* Product Image */}
          <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={product.image}
              alt={product.name}
              className="object-cover object-center"
              fill
              priority
            />
          </div>

          {/* Product Details */}
          <div className="mt-10 lg:mt-0 lg:pl-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{product.name}</h1>
            
            {/* Category */}
            <div className="mt-3">
              <h2 className="sr-only">Product category</h2>
              <p className="text-sm text-gray-600">{product.category}</p>
            </div>

            {/* Rating */}
            <div className="mt-4">
              <h2 className="sr-only">Product rating</h2>
              <div className="flex items-center">
                <div className="flex items-center">
                  {[0, 1, 2, 3, 4].map((rating) => (
                    <StarIcon
                      key={rating}
                      className={`${
                        product.rating > rating ? 'text-yellow-400' : 'text-gray-200'
                      } h-5 w-5 flex-shrink-0`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="ml-3 text-sm text-gray-600">
                  {product.reviews} reviews
                </p>
              </div>
            </div>

            {/* Price */}
            <div className="mt-6">
              <h2 className="sr-only">Product price</h2>
              <p className="text-3xl tracking-tight text-gray-900">
                ${product.price.toFixed(2)}
              </p>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h2 className="sr-only">Product description</h2>
              <p className="text-base text-gray-900">{product.description}</p>
            </div>

            {/* Add to Cart Button */}
            <div className="mt-10">
              <button
                type="button"
                className="w-full bg-blue-600 py-3 px-4 rounded-md text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add to Cart
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-10 border-t border-gray-200 pt-10">
              <h3 className="text-sm font-medium text-gray-900">Shipping</h3>
              <p className="mt-2 text-sm text-gray-500">
                Free shipping on orders over $50. Estimated delivery time: 3-5 business days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
