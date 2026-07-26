import { RepositoryFactory } from '../models/repositories/repository.factory.ts';
import type { Product } from '../models/types/catalog.types.ts';
import type { PaginatedResult } from '../models/repositories/product.repository.ts';

export async function getAllProducts(options: {
  categorySlug?: string;
  searchQuery?: string;
  limit: number;
  offset: number;
}): Promise<PaginatedResult<Product>> {
  const { categorySlug, searchQuery, limit, offset } = options;
  const productRepo = RepositoryFactory.getProductRepository();
  const categoryRepo = RepositoryFactory.getCategoryRepository();

  const paginatedResult = await productRepo.getPaginated({
    limit: 1000,
    offset: 0
  });

  let filtered = paginatedResult.results;

  if (categorySlug) {
    const category = await categoryRepo.getBySlug(categorySlug);
    if (category) {
      filtered = filtered.filter(p => p.categoryId === category.id);
    } else {
      return { results: [], total: 0, limit, offset };
    }
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(p => {
      if (p.name.toLowerCase().includes(query)) return true;
      if (p.description && p.description.toLowerCase().includes(query)) return true;

      if (p.attributes) {
        for (const value of Object.values(p.attributes)) {
          if (value !== null && value !== undefined && String(value).toLowerCase().includes(query)) {
            return true;
          }
        }
      }

      if (p.variants) {
        for (const variant of p.variants) {
          if (variant.attributes) {
            for (const value of Object.values(variant.attributes)) {
              if (value !== null && value !== undefined && String(value).toLowerCase().includes(query)) {
                return true;
              }
            }
          }
        }
      }

      return false;
    });
  }

  const total = filtered.length;
  const results = filtered.slice(offset, offset + limit);

  return {
    results,
    total,
    limit,
    offset
  };
}

export async function getProductById(id: string): Promise<Product | null> {
  const productRepo = RepositoryFactory.getProductRepository();
  return await productRepo.getById(id);
}

