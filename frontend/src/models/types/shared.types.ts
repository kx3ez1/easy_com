/**
 * Represents a monetary value in a specific currency.
 */
export interface Money {
  /**
   * Decimal representation of the monetary value (e.g., 99.99).
   */
  amount: number;

  /**
   * ISO 4217 Currency Code (e.g., "USD", "EUR").
   * Optional within transaction entities (like Order) if a parent entity 
   * defines a default currency for the scope.
   */
  currency?: string;
}

/**
 * Standardized weight representation to avoid measurement ambiguity.
 */
export interface Weight {
  value: number;
  unit: "g" | "kg" | "oz" | "lb";
}

/**
 * Standardized physical dimension representation.
 */
export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: "cm" | "in";
}

export type InventoryMode = "SIMPLE" | "MULTI_LOCATION";

export interface Address {
  recipientName: string;
  phoneNumber?: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string; // Optional for countries/regions without administrative states
  postalCode: string;
  countryCode: string; // ISO 3166-1 alpha-2 or alpha-3 recommended
}

export interface GuestCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}