import { describe, test, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { ZetaDBClient } from './zetadb.client.ts';

describe('ZetaDBClient Integration Tests', () => {
  let client: ZetaDBClient;
  const testKey = 'test-integration-key';
  const testValue = { message: 'hello from real test', timestamp: Date.now() };

  beforeEach(() => {
    process.env.ZETADB_URL = 'http://localhost:8081';
    process.env.ZETADB_API_KEY = '';
    client = new ZetaDBClient();
  });

  test('constructor parses env correctly', () => {
    expect((client as any).baseUrl).toBe('http://localhost:8081');
  });

  describe('Key Lifecycle Operations', () => {
    beforeAll(async () => {
      const c = new ZetaDBClient();
      await c.delete(testKey);
    });

    afterAll(async () => {
      const c = new ZetaDBClient();
      await c.delete(testKey);
    });

    test('should write value into key successfully', async () => {
      const putRes = await client.put(testKey, testValue);
      expect(putRes.status).toBe('success');
    });

    test('should fetch back correct stored payload', async () => {
      const getRes = await client.get<any>(testKey);
      expect(getRes.status).toBe('success');
      expect(getRes.data?.value).toEqual(testValue);
      expect(getRes.data?.type).toBe('VAL_JSON_BLOB');
    });

    test('should retrieve bulk keys successfully', async () => {
      const bulkRes = await client.bulkGet([testKey]);
      expect(bulkRes.status).toBe('success');
      expect(bulkRes.data?.results[0]).toEqual(
        expect.objectContaining({
          key: testKey,
          status: 'success',
          type: 'VAL_JSON_BLOB',
          value: testValue
        })
      );
    });

    test('should delete key successfully', async () => {
      const deleteRes = await client.delete(testKey);
      expect(deleteRes.status).toBe('success');
    });

    test('should return null for deleted key', async () => {
      const getAfterDeleteRes = await client.get(testKey);
      expect(getAfterDeleteRes.data).toBeNull();
    });
  });

  describe('Compare-And-Swap (CAS) Updates', () => {
    let currentVersion: number;

    beforeAll(async () => {
      const c = new ZetaDBClient();
      await c.delete(testKey);
    });

    afterAll(async () => {
      const c = new ZetaDBClient();
      await c.delete(testKey);
    });

    test('should successfully do initial write', async () => {
      const putRes = await client.put<any>(testKey, 'initial value');
      expect(putRes.status).toBe('success');
    });

    test('should write a second value and increment version to 2', async () => {
      const putRes = await client.put<any>(testKey, 'second value');
      expect(putRes.status).toBe('success');
      currentVersion = putRes.data?.version ?? 0;
      expect(currentVersion).toBe(2);
    });

    test('should perform CAS update successfully with matching version', async () => {
      const putRes = await client.put<any>(testKey, 'updated value', { cas: currentVersion });
      expect(putRes.status).toBe('success');
      expect(putRes.data?.version).toBe(3);
    });

    test('should reject CAS update with VERSION_MISMATCH when version is stale', async () => {
      const putRes = await client.put<any>(testKey, 'stale update', { cas: currentVersion });
      expect(putRes.status).toBe('error');
      expect(putRes.code).toBe('VERSION_MISMATCH');
    });
  });

  describe('Key Length Validation', () => {
    test('should reject keys longer than 128 characters', async () => {
      const lengths = [64, 128, 256, 512];
      const results = await Promise.all(
        lengths.map(async (len) => {
          const key = 'a'.repeat(len);
          try {
            const putRes = await client.put(key, 'test-val');
            if (putRes.status === 'success') {
              await client.delete(key);
              return { len, success: true };
            }
            return { len, success: false };
          } catch {
            return { len, success: false };
          }
        })
      );

      const successfulLengths = results.filter((r) => r.success).map((r) => r.len);
      const maxWorking = Math.max(...successfulLengths, 0);

      expect(maxWorking).toBe(128);
    });
  });
});
