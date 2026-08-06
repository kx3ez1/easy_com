import type { IProductRepository, PaginatedResult } from './product.repository.ts';
import type { Product } from '../types/catalog.types.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';

function normalizeProduct(product: any): Product {
  if (!product) return product;
  const normalized = { ...product };
  if (typeof normalized.price === 'number') {
    normalized.price = { amount: normalized.price, currency: 'USD' };
  }
  return normalized as Product;
}

export class ZetaProductRepository implements IProductRepository {
  private client = new ZetaDBClient();

  private getProductKey(id: string): string {
    return `product:${id}`;
  }

  async getById(id: string): Promise<Product | null> {
    const res = await this.client.get<{ value: Product }>(this.getProductKey(id));
    if (res.status === 'success' && res.data) {
      return normalizeProduct(res.data.value);
    }
    return null;
  }

  async getPaginated(options: {
    limit: number;
    offset: number;
    categorySlug?: string;
    searchQuery?: string;
  }): Promise<PaginatedResult<Product>> {
    const { limit, offset, categorySlug, searchQuery } = options;

    let filterPattern = 'product:*';
    if (categorySlug) {
      filterPattern = `product:category:${categorySlug}:*`;
    }

    const baseUrl = process.env.ZETADB_URL || 'http://localhost:8080';
    const queryUrl = `${baseUrl}/query?q=${filterPattern}&type=wildcard&limit=${limit}&offset=${offset}`;
    const keysRes = await fetch(queryUrl, {
      headers: {
        'X-API-Key': process.env.ZETADB_API_KEY || '',
      },
    });
    const keysData = await keysRes.json();

    if (keysData.status !== 'success' || !keysData.data?.results) {
      return { results: [], total: 0, limit, offset };
    }

    const products: Product[] = keysData.data.results.map((r: any) => {
      const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
      return normalizeProduct(val);
    });

    return {
      results: products,
      total: keysData.data.total || products.length,
      limit,
      offset,
    };
  }

  async create(product: Omit<Product, 'id'>): Promise<Product> {
    const id = crypto.randomUUID();
    const newProduct = { ...product, id } as Product;

    const res = await this.client.put(this.getProductKey(id), newProduct);
    if (res.status === 'error') {
      throw new Error(`Failed to create product in ZetaDB: ${res.error?.message}`);
    }
    return newProduct;
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Product with ID ${id} not found`);
    }
    const updatedProduct = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    const res = await this.client.put(this.getProductKey(id), updatedProduct);
    if (res.status === 'error') {
      throw new Error(`Failed to update product in ZetaDB: ${res.error?.message}`);
    }
    return updatedProduct;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;
    existing.deletedAt = new Date();
    existing.status = 'ARCHIVED';
    await this.client.put(this.getProductKey(id), existing);
  }
}
