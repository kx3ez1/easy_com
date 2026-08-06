import type { Address } from './shared.types.ts';

export interface AddressBookEntry extends Address {
  id: string;
  label?: string; // e.g., "Home", "Work"
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface UserProfile {
  id: string; // Internal identifier
  uid: string; // Authentication UID (e.g. Firebase UID)
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  addresses?: AddressBookEntry[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  lastLogin?: Date;
}
