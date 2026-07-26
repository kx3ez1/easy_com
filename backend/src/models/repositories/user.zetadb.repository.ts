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

    await this.client.delete(this.getProfileKey(id));
    await this.client.delete(this.getUidKey(existing.uid));
    await this.client.delete(this.getEmailKey(existing.email));
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
