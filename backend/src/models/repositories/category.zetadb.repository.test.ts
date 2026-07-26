import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ZetaCategoryRepository } from './category.zetadb.repository.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';
import type { Category } from '../types/catalog.types.ts';

describe('ZetaCategoryRepository Integration Tests', () => {
  let repository: ZetaCategoryRepository;
  let client: ZetaDBClient;
  let testCategoryId: string;

  beforeAll(() => {
    process.env.ZETADB_URL = 'http://localhost:8081';
    process.env.ZETADB_API_KEY = '';
    repository = new ZetaCategoryRepository();
    client = new ZetaDBClient();
  });

  afterAll(async () => {
    if (testCategoryId) {
      await client.delete(`category:${testCategoryId}`);
    }
  });

  test('should retrieve all categories and seed default ones if none exist', async () => {
    const list = await repository.getAll();
    expect(list).toBeDefined();
    expect(list.length).toBeGreaterThanOrEqual(6);
    const electronics = list.find(c => c.id === 'cat-electronics');
    expect(electronics).toBeDefined();
    expect(electronics?.slug).toBe('electronics');
  });

  test('should get a category by ID', async () => {
    const category = await repository.getById('cat-electronics');
    expect(category).toBeDefined();
    expect(category?.id).toBe('cat-electronics');
    expect(category?.name).toBe('Electronics');
  });

  test('should get a category by slug', async () => {
    const category = await repository.getBySlug('electronics');
    expect(category).toBeDefined();
    expect(category?.id).toBe('cat-electronics');
    expect(category?.name).toBe('Electronics');
  });

  test('should create a new category', async () => {
    const newCatData: Omit<Category, 'id'> = {
      name: 'Test Category',
      slug: 'test-category',
      sortOrder: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await repository.create(newCatData);
    expect(created.id).toBeDefined();
    testCategoryId = created.id;
    expect(created.name).toBe('Test Category');
    expect(created.slug).toBe('test-category');

    const fetched = await repository.getById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Test Category');
  });
});
