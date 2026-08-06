import type { Product } from '../types/catalog.types.ts';

export interface PaginatedResult<T> {
  results: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface IProductRepository {
  getPaginated(options: {
    limit: number;
    offset: number;
    categorySlug?: string;
    searchQuery?: string;
  }): Promise<PaginatedResult<Product>>;
  
  getById(id: string): Promise<Product | null>;
  create(product: Omit<Product, 'id'>): Promise<Product>;
  update(id: string, product: Partial<Product>): Promise<Product>;
  delete(id: string): Promise<void>;
}
