import type { IUserProfileRepository } from './user.repository.ts';
import type { UserProfile, UserRole, AddressBookEntry } from '../types/user.types.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';

function parseProfileDates(profile: any): UserProfile {
  if (!profile) return profile;
  const parsed = { ...profile };
  if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
  if (parsed.updatedAt) parsed.updatedAt = new Date(parsed.updatedAt);
  if (parsed.lastLogin) parsed.lastLogin = new Date(parsed.lastLogin);
  return parsed as UserProfile;
}

export class ZetaUserProfileRepository implements IUserProfileRepository {
  private client = new ZetaDBClient();

  private getProfileKey(id: string): string {
    return `user:${id}`;
  }

  private getUidKey(uid: string): string {
    return `user:uid:${uid}`;
  }

  private getEmailKey(email: string): string {
    return `user:email:${email.toLowerCase()}`;
  }

  async getPaginated(options: { limit: number; offset: number }): Promise<import('./product.repository.ts').PaginatedResult<UserProfile>> {
    const { limit, offset } = options;
    const filterPattern = 'user:*';

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

    const filteredResults = keysData.data.results.filter(
      (r: any) => !r.key.startsWith('user:uid:') && !r.key.startsWith('user:email:')
    );

    const activeUsers: UserProfile[] = [];
    for (const r of filteredResults) {
      const parsed = parseProfileDates(typeof r.value === 'string' ? JSON.parse(r.value) : r.value);
      if (parsed && !parsed.deletedAt) {
        activeUsers.push(parsed);
      }
    }

    const totalActive = activeUsers.length;
    const paginatedUsers = activeUsers.slice(offset, offset + limit);

    return {
      results: paginatedUsers,
      total: totalActive,
      limit,
      offset,
    };
  }

  async getById(id: string): Promise<UserProfile | null> {
    const res = await this.client.get<{ value: UserProfile }>(this.getProfileKey(id));
    if (res.status === 'success' && res.data) {
      return parseProfileDates(res.data.value);
    }
    return null;
  }

  async getByUid(uid: string): Promise<UserProfile | null> {
    const res = await this.client.get<string>(this.getUidKey(uid));
    if (res.status === 'success' && res.data) {
      const id = typeof res.data === 'string' ? res.data : (res.data as any).value;
      if (id) {
        return this.getById(id);
      }
    }
    return null;
  }

  async getByEmail(email: string): Promise<UserProfile | null> {
    const res = await this.client.get<string>(this.getEmailKey(email));
    if (res.status === 'success' && res.data) {
      const id = typeof res.data === 'string' ? res.data : (res.data as any).value;
      if (id) {
        return this.getById(id);
      }
    }
    return null;
  }

  async create(profile: Omit<UserProfile, 'id' | 'createdAt' | 'role'> & { role?: UserRole }): Promise<UserProfile> {
    const id = crypto.randomUUID();
    const createdAt = new Date();
    const newProfile: UserProfile = {
      role: 'CUSTOMER',
      ...profile,
      id,
      createdAt,
      addresses: profile.addresses || [],
    };

    // Store main record
    const res = await this.client.put(this.getProfileKey(id), newProfile);
    if (res.status === 'error') {
      throw new Error(`Failed to create user profile in ZetaDB: ${res.error?.message}`);
    }

    // Store index mappings
    await this.client.put(this.getUidKey(profile.uid), id);
    await this.client.put(this.getEmailKey(profile.email), id);

    return parseProfileDates(newProfile);
  }

  async update(id: string, updates: Omit<Partial<UserProfile>, 'role'>): Promise<UserProfile> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`User profile with ID ${id} not found`);
    }

    // Explicitly destructure to ignore role updates at runtime.
    // Modifying user roles is not allowed via general update, only through dedicated methods/routes in the future.
    const { role, ...allowedUpdates } = updates as any;

    const updatedProfile: UserProfile = {
      ...existing,
      ...allowedUpdates,
      id, // ensure id doesn't change
      role: existing.role, // lock the role to the existing role
      updatedAt: new Date(),
    };

    // Update main record
    const res = await this.client.put(this.getProfileKey(id), updatedProfile);
    if (res.status === 'error') {
      throw new Error(`Failed to update user profile in ZetaDB: ${res.error?.message}`);
    }

    // If UID changed (rare/unlikely, but handle it), update index mapping
    if (updates.uid && updates.uid !== existing.uid) {
      await this.client.delete(this.getUidKey(existing.uid));
      await this.client.put(this.getUidKey(updates.uid), id);
    }

    // If email changed, update index mapping
    if (updates.email && updates.email.toLowerCase() !== existing.email.toLowerCase()) {
      await this.client.delete(this.getEmailKey(existing.email));
      await this.client.put(this.getEmailKey(updates.email), id);
    }

    return parseProfileDates(updatedProfile);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    existing.deletedAt = new Date();
    await this.client.put(this.getProfileKey(id), existing);
  }

  async addAddress(userId: string, address: Omit<AddressBookEntry, 'id'>): Promise<UserProfile> {
    const profile = await this.getById(userId);
    if (!profile) {
      throw new Error(`UserProfile ${userId} not found`);
    }
    const newAddress: AddressBookEntry = {
      ...address,
      id: crypto.randomUUID(),
    };
    
    let updatedAddresses = [...(profile.addresses || [])];
    if (newAddress.isDefaultShipping) {
      updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefaultShipping: false }));
    }
    if (newAddress.isDefaultBilling) {
      updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefaultBilling: false }));
    }
    updatedAddresses.push(newAddress);
    
    return this.update(userId, { addresses: updatedAddresses });
  }

  async updateAddress(userId: string, addressId: string, address: Partial<Omit<AddressBookEntry, 'id'>>): Promise<UserProfile> {
    const profile = await this.getById(userId);
    if (!profile) {
      throw new Error(`UserProfile ${userId} not found`);
    }

    let updatedAddresses = [...(profile.addresses || [])];
    const targetIndex = updatedAddresses.findIndex(a => a.id === addressId);
    if (targetIndex === -1) {
      throw new Error(`Address ${addressId} not found`);
    }

    const currentAddr = updatedAddresses[targetIndex];
    const isDefaultShipping = address.isDefaultShipping !== undefined ? address.isDefaultShipping : currentAddr!.isDefaultShipping;
    const isDefaultBilling = address.isDefaultBilling !== undefined ? address.isDefaultBilling : currentAddr!.isDefaultBilling;

    if (isDefaultShipping) {
      updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefaultShipping: false }));
    }
    if (isDefaultBilling) {
      updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefaultBilling: false }));
    }

    updatedAddresses[targetIndex] = {
      ...currentAddr,
      ...address,
      id: addressId,
      isDefaultShipping: isDefaultShipping as boolean,
      isDefaultBilling: isDefaultBilling as boolean,
    } as any;

    return this.update(userId, { addresses: updatedAddresses });
  }

  async removeAddress(userId: string, addressId: string): Promise<UserProfile> {
    const profile = await this.getById(userId);
    if (!profile) {
      throw new Error(`UserProfile ${userId} not found`);
    }
    const updatedAddresses = (profile.addresses || []).filter(a => a.id !== addressId);
    return this.update(userId, { addresses: updatedAddresses });
  }

  async setDefaultAddress(userId: string, addressId: string, type: 'shipping' | 'billing'): Promise<UserProfile> {
    const profile = await this.getById(userId);
    if (!profile) {
      throw new Error(`UserProfile ${userId} not found`);
    }
    const updatedAddresses = (profile.addresses || []).map(a => {
      const isTarget = a.id === addressId;
      if (type === 'shipping') {
        return { ...a, isDefaultShipping: isTarget };
      } else {
        return { ...a, isDefaultBilling: isTarget };
      }
    });
    return this.update(userId, { addresses: updatedAddresses });
  }
}
