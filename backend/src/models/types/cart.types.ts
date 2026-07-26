import type { Money } from './shared.types.ts';

export interface CartItem {
  sku: string;
  qty: number;
  price: Money;
  productId?: string | null;
  productName?: string;
  imageUrl?: string | null;
  variantId?: string | null;
  status?: string;
  trackInventory?: boolean;
  stockQuantity?: number;
  allowBackorder?: boolean;
}

export interface Cart {
  user_id: string;
  cart_version: number;
  items: CartItem[];
  updatedAt?: Date;
}

export interface CheckoutSnapshotItem {
  sku: string;
  qty: number;
  locked_price: Money;
}

export interface CheckoutSnapshot {
  checkout_id: string;
  user_id: string;
  status: "active" | "completed" | "expired";
  expires_at: string; // ISO string
  snapshot: {
    source_cart_version: number;
    locked_items: CheckoutSnapshotItem[];
    locked_total: Money;
  };
  createdAt: Date;
}
