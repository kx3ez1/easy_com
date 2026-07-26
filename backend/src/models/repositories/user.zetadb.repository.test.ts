import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ZetaUserProfileRepository } from './user.zetadb.repository.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';
import type { UserProfile } from '../types/user.types.ts';

describe('ZetaUserProfileRepository Integration Tests', () => {
  let repository: ZetaUserProfileRepository;
  let client: ZetaDBClient;
  let createdProfileId: string;

  const testProfileData: Omit<UserProfile, 'id' | 'createdAt'> = {
    uid: 'firebase-uid-12345',
    email: 'john.doe@example.com',
    role: 'CUSTOMER',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+15551234567',
    addresses: [
      {
        id: 'address-1',
        label: 'Home',
        recipientName: 'John Doe',
        addressLine1: '123 Main St',
        city: 'Metropolis',
        postalCode: '10001',
        countryCode: 'US',
        isDefaultShipping: true,
        isDefaultBilling: true,
      },
      {
        id: 'address-2',
        label: 'Work',
        recipientName: 'John Doe',
        addressLine1: '456 Corporate Blvd',
        city: 'Gotham',
        postalCode: '20002',
        countryCode: 'US',
        isDefaultShipping: false,
        isDefaultBilling: false,
      }
    ],
    metadata: { preferences: { theme: 'dark' } }
  };

  beforeAll(() => {
    process.env.ZETADB_URL = 'http://localhost:8081';
    process.env.ZETADB_API_KEY = '';
    repository = new ZetaUserProfileRepository();
    client = new ZetaDBClient();
  });

  afterAll(async () => {
    if (createdProfileId) {
      await repository.delete(createdProfileId);
    }
  });

  test('should create a user profile successfully', async () => {
    const created = await repository.create(testProfileData);
    expect(created.id).toBeDefined();
    createdProfileId = created.id;
    expect(created.uid).toBe(testProfileData.uid);
    expect(created.email).toBe(testProfileData.email);
    expect(created.role).toBe('CUSTOMER');
    expect(created.firstName).toBe('John');
    expect(created.addresses).toHaveLength(2);
    expect(created.addresses?.[0]?.label).toBe('Home');
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  test('should create a user profile with default customer role if omitted', async () => {
    const { role, ...profileWithoutRole } = testProfileData;
    const created = await repository.create({
      ...profileWithoutRole,
      uid: 'firebase-uid-no-role',
      email: 'no-role@example.com'
    });
    expect(created.id).toBeDefined();
    expect(created.role).toBe('CUSTOMER');
    await repository.delete(created.id);
  });

  test('should retrieve user profile by ID', async () => {
    const fetched = await repository.getById(createdProfileId);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(createdProfileId);
    expect(fetched?.uid).toBe(testProfileData.uid);
    expect(fetched?.email).toBe(testProfileData.email);
  });

  test('should retrieve user profile by UID', async () => {
    const fetched = await repository.getByUid(testProfileData.uid);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(createdProfileId);
    expect(fetched?.uid).toBe(testProfileData.uid);
  });

  test('should retrieve user profile by Email (case-insensitive)', async () => {
    const fetched = await repository.getByEmail('JOHN.DOE@example.com');
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(createdProfileId);
    expect(fetched?.email).toBe(testProfileData.email);
  });

  test('should update profile and index mapping on email change', async () => {
    const newEmail = 'john.updated@example.com';
    const loginTime = new Date();
    const updated = await repository.update(createdProfileId, {
      email: newEmail,
      firstName: 'Johnny',
      lastLogin: loginTime,
      addresses: [
        ...testProfileData.addresses!,
        {
          id: 'address-3',
          label: 'Vacation Home',
          recipientName: 'John Doe',
          addressLine1: '789 Beach Rd',
          city: 'Miami',
          postalCode: '33139',
          countryCode: 'US'
        }
      ]
    } as any);

    expect(updated.email).toBe(newEmail);
    expect(updated.firstName).toBe('Johnny');
    expect(updated.role).toBe('CUSTOMER'); // Verified: role change is ignored
    expect(updated.lastLogin).toBeInstanceOf(Date);
    expect(updated.lastLogin?.getTime()).toBe(loginTime.getTime());
    expect(updated.addresses).toHaveLength(3);
    expect(updated.updatedAt).toBeInstanceOf(Date);

    // Verify email lookup works for new email
    const fetchedNew = await repository.getByEmail(newEmail);
    expect(fetchedNew).not.toBeNull();
    expect(fetchedNew?.id).toBe(createdProfileId);

    // Verify old email lookup returns null
    const fetchedOld = await repository.getByEmail(testProfileData.email);
    expect(fetchedOld).toBeNull();
  });

  test('should return null when profile is not found', async () => {
    const result = await repository.getById('non-existent-uuid');
    expect(result).toBeNull();

    const resultUid = await repository.getByUid('non-existent-uid');
    expect(resultUid).toBeNull();

    const resultEmail = await repository.getByEmail('non-existent@example.com');
    expect(resultEmail).toBeNull();
  });

  test('should add, set defaults, and remove addresses correctly', async () => {
    // 1. Add address
    const updated1 = await repository.addAddress(createdProfileId, {
      label: 'Beach House',
      recipientName: 'John Doe',
      addressLine1: '123 Ocean Dr',
      city: 'Miami',
      postalCode: '33101',
      countryCode: 'US',
      isDefaultShipping: true
    });
    
    const addedAddress = updated1.addresses?.find(a => a.label === 'Beach House');
    expect(addedAddress).toBeDefined();
    expect(addedAddress?.isDefaultShipping).toBe(true);
    // Other addresses should have had isDefaultShipping set to false
    const otherAddr = updated1.addresses?.find(a => a.label === 'Home');
    expect(otherAddr?.isDefaultShipping).toBe(false);

    // 2. Set default address
    const updated2 = await repository.setDefaultAddress(createdProfileId, otherAddr!.id, 'shipping');
    const resetAddr = updated2.addresses?.find(a => a.label === 'Home');
    expect(resetAddr?.isDefaultShipping).toBe(true);
    const miamiAddr = updated2.addresses?.find(a => a.label === 'Beach House');
    expect(miamiAddr?.isDefaultShipping).toBe(false);

    // 3. Remove address
    const updated3 = await repository.removeAddress(createdProfileId, addedAddress!.id);
    expect(updated3.addresses?.find(a => a.label === 'Beach House')).toBeUndefined();
  });
});
