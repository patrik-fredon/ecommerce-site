import { StarIcon } from '@heroicons/react/20/solid';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '../utils/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        <div className="relative h-full w-full">
          <Image
            src={product.image}
            alt={product.name}
            className="object-cover object-center group-hover:opacity-75 transition-opacity"
            fill
          />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
          <p className="text-sm font-medium text-gray-900">${product.price.toFixed(2)}</p>
        </div>
        <p className="text-sm text-gray-500">{product.category}</p>
        <div className="flex items-center">
          <div className="flex items-center">
            {[0, 1, 2, 3, 4].map((rating) => (
              <StarIcon
                key={rating}
                className={`${
                  product.rating > rating ? 'text-yellow-400' : 'text-gray-200'
                } h-4 w-4 flex-shrink-0`}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="ml-2 text-sm text-gray-500">
            ({product.reviews} reviews)
          </p>
        </div>
      </div>
    </Link>
  );
}
