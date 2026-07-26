import type { ICategoryRepository } from './category.repository.ts';
import type { Category } from '../types/catalog.types.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "cat-electronics",
    name: "Electronics",
    slug: "electronics",
    sortOrder: 1,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z")
  },
  {
    id: "cat-home-kitchen",
    name: "Home & Kitchen",
    slug: "home-kitchen",
    sortOrder: 2,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z")
  },
  {
    id: "cat-apparel",
    name: "Apparel",
    slug: "apparel",
    sortOrder: 3,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z")
  },
  {
    id: "cat-books-media",
    name: "Books & Media",
    slug: "books-media",
    sortOrder: 4,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z")
  },
  {
    id: "cat-sports-outdoors",
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    sortOrder: 5,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z")
  },
  {
    id: "cat-beauty-personal-care",
    name: "Beauty & Personal Care",
    slug: "beauty-personal-care",
    sortOrder: 6,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z")
  }
];

export class ZetaCategoryRepository implements ICategoryRepository {
  private client = new ZetaDBClient();

  private getCategoryKey(id: string): string {
    return `category:${id}`;
  }

  async getAll(): Promise<Category[]> {
    const baseUrl = process.env.ZETADB_URL || 'http://localhost:8080';
    const queryUrl = `${baseUrl}/query?q=category:*&type=wildcard`;
    const keysRes = await fetch(queryUrl, {
      headers: {
        'X-API-Key': process.env.ZETADB_API_KEY || '',
      },
    });
    const keysData = await keysRes.json();

    if (keysData.status !== 'success' || !keysData.data?.results || keysData.data.results.length === 0) {
      // Seed default categories
      for (const cat of DEFAULT_CATEGORIES) {
        await this.client.put(this.getCategoryKey(cat.id), cat);
      }
      return DEFAULT_CATEGORIES;
    }

    return keysData.data.results.map((r: any) => {
      return typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
    });
  }

  async getById(id: string): Promise<Category | null> {
    const res = await this.client.get<{ value: Category }>(this.getCategoryKey(id));
    if (res.status === 'success' && res.data) {
      return res.data.value;
    }
    return null;
  }

  async getBySlug(slug: string): Promise<Category | null> {
    const all = await this.getAll();
    return all.find(c => c.slug.toLowerCase() === slug.toLowerCase()) || null;
  }

  async create(category: Omit<Category, 'id'>): Promise<Category> {
    const id = crypto.randomUUID();
    const newCategory = { ...category, id } as Category;
    const res = await this.client.put(this.getCategoryKey(id), newCategory);
    if (res.status === 'error') {
      throw new Error(`Failed to create category in ZetaDB: ${res.error?.message}`);
    }
    return newCategory;
  }
}
