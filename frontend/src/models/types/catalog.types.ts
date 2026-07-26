import type { Money, Weight, Dimensions, InventoryMode } from "./shared.types.ts";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

/**
 * Physical stock pool at a designated storage location.
 */
export interface Inventory {
  warehouseId: string;
  warehouseName?: string;
  quantity: number;
  reservedQuantity?: number;
  allowBackorder?: boolean;
  updatedAt?: Date;
}

/**
 * Concrete SKU/variation of a parent product.
 */
export interface ProductVariant {
  id: string;
  sku?: string;

  /**
   * Deterministic ordering for storefront rendering.
   */
  displayOrder?: number;

  /**
   * Indicates if this specific variant is a digital asset (e.g., a PDF variant
   * of an otherwise physical book). If undefined, inherits parent Product.isDigital.
   */
  isDigital?: boolean;

  /**
   * Used only when inventoryMode on the parent product is "SIMPLE".
   */
  stockQuantity?: number;

  /**
   * Multi-location inventory pools. Used only when parent inventoryMode is "MULTI_LOCATION".
   */
  inventory?: Inventory[];

  /**
   * Overrides parent product base price. Defaults to parent price if undefined.
   */
  price?: Money;
  imageUrl?: string;
  weight?: Weight;
  dimensions?: Dimensions;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  attributes?: Record<string, unknown>;
}

/**
 * Core product catalog definition containing base specifications.
 */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sku?: string;

  /**
   * Base/default product price.
   */
  price: Money;

  /**
   * Indicates if the product is a digital good (e.g., license, subscription, e-book).
   * Digital goods typically do not require inventory, shipping weight, or physical delivery.
   */
  isDigital?: boolean;

  /**
   * Governs whether stock is managed in a single pool or split by location.
   */
  inventoryMode: InventoryMode;

  /**
   * Simple product inventory. Used only when the product has NO variants and inventoryMode is "SIMPLE".
   */
  stockQuantity?: number;

  trackInventory?: boolean;
  allowBackorder?: boolean;
  imageUrl: string;
  galleryUrls?: string[];
  categoryId?: string;
  variants?: ProductVariant[];
  weight?: Weight;
  dimensions?: Dimensions;

  /**
   * Regional tax classification metadata.
   */
  taxCategory?: string;

  /**
   * Direct tax code mapped to 3rd-party tax providers.
   */
  taxCode?: string;

  salePrice?: Money;
  saleStartDate?: Date;
  saleEndDate?: Date;

  metaTitle?: string;
  metaDescription?: string;
  isFeatured?: boolean;
  status: ProductStatus;

  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}