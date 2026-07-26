import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ZetaProductRepository } from './product.zetadb.repository.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';
import type { Product } from '../types/catalog.types.ts';

describe('ZetaProductRepository Integration Tests', () => {
  let repository: ZetaProductRepository;
  let client: ZetaDBClient;
  let testProductId: string;

  const testProductData: Omit<Product, 'id'> = {
    name: 'Test Controller',
    slug: 'test-controller',
    price: { amount: 2999, currency: 'USD' },
    inventoryMode: 'SIMPLE',
    imageUrl: 'http://example.com/image.png',
    status: 'ACTIVE'
  };

  beforeAll(() => {
    process.env.ZETADB_URL = 'http://localhost:8081';
    process.env.ZETADB_API_KEY = '';
    repository = new ZetaProductRepository();
    client = new ZetaDBClient();
  });

  afterAll(async () => {
    if (testProductId) {
      await client.delete(`product:${testProductId}`);
    }
  });

  test('should create a product successfully', async () => {
    const created = await repository.create(testProductData);
    expect(created.id).toBeDefined();
    testProductId = created.id;
    expect(created.name).toBe('Test Controller');
    expect(created.slug).toBe('test-controller');
  });

  test('should retrieve product by ID with matching values', async () => {
    const fetched = await repository.getById(testProductId);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(testProductId);
    expect(fetched?.name).toBe('Test Controller');
    expect(fetched?.slug).toBe('test-controller');
  });

  test('should return null when product is not found', async () => {
    const result = await repository.getById('non-existent-uuid');
    expect(result).toBeNull();
  });

  test('should fetch a paginated list containing the created product', async () => {
    const paginated = await repository.getPaginated({ limit: 10, offset: 0 });
    expect(paginated.results).toBeDefined();
    expect(paginated.results.length).toBeGreaterThan(0);
    
    const found = paginated.results.find(p => p.id === testProductId);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Test Controller');
  });

  test('all products in database should conform to Product type constraints', async () => {
    const paginated = await repository.getPaginated({ limit: 100, offset: 0 });
    expect(paginated.results).toBeDefined();
    
    for (const product of paginated.results) {
      expect(typeof product.id).toBe('string');
      expect(typeof product.name).toBe('string');
      expect(typeof product.slug).toBe('string');
      expect(product.price).toBeDefined();
      expect(typeof product.price.amount).toBe('number');
      expect(typeof product.price.currency).toBe('string');
      
      expect(['SIMPLE', 'MULTI_LOCATION']).toContain(product.inventoryMode);
      expect(['ACTIVE', 'DRAFT', 'ARCHIVED']).toContain(product.status);
      expect(typeof product.imageUrl).toBe('string');
      
      if (product.galleryUrls) {
        expect(Array.isArray(product.galleryUrls)).toBe(true);
        product.galleryUrls.forEach(url => {
          expect(typeof url).toBe('string');
        });
      }
      
      if (product.variants) {
        expect(Array.isArray(product.variants)).toBe(true);
        product.variants.forEach(variant => {
          expect(typeof variant.id).toBe('string');
        });
      }
    }
  });
});

