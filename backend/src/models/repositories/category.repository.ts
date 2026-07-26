import type { Category } from '../types/catalog.types.ts';

export interface ICategoryRepository {
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  getBySlug(slug: string): Promise<Category | null>;
  create(category: Omit<Category, 'id'>): Promise<Category>;
}
