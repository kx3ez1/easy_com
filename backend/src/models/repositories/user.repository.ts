import type { UserProfile, UserRole, AddressBookEntry } from '../types/user.types.ts';
import type { PaginatedResult } from './product.repository.ts';

export interface IUserProfileRepository {
  getPaginated(options: { limit: number; offset: number }): Promise<PaginatedResult<UserProfile>>;
  getById(id: string): Promise<UserProfile | null>;
  getByUid(uid: string): Promise<UserProfile | null>;
  getByEmail(email: string): Promise<UserProfile | null>;
  create(profile: Omit<UserProfile, 'id' | 'createdAt' | 'role'> & { role?: UserRole }): Promise<UserProfile>;
  // NOTE: General profile update explicitly blocks role updates. 
  // Modifying user roles will be allowed only via a specialized route/method in the future.
  update(id: string, updates: Omit<Partial<UserProfile>, 'role'>): Promise<UserProfile>;
  delete(id: string): Promise<void>;
  addAddress(userId: string, address: Omit<AddressBookEntry, 'id'>): Promise<UserProfile>;
  updateAddress(userId: string, addressId: string, address: Partial<Omit<AddressBookEntry, 'id'>>): Promise<UserProfile>;
  removeAddress(userId: string, addressId: string): Promise<UserProfile>;
  setDefaultAddress(userId: string, addressId: string, type: 'shipping' | 'billing'): Promise<UserProfile>;
}
