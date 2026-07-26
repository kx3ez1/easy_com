import type { Money, Address, GuestCustomer } from "./shared.types.ts";

export type OrderStatus =
  | "PENDING"
  | "OPEN"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED"
  | "RETURNED";

export type OrderApprovalStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type OrderPaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PARTIALLY_AUTHORIZED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "PARTIALLY_FAILED"
  | "FAILED"
  | "PARTIALLY_VOIDED"
  | "VOIDED";

export type OrderFulfillmentStatus =
  | "UNFULFILLED"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PARTIALLY_AUTHORIZED"
  | "CAPTURED"
  | "PARTIALLY_CAPTURED"
  | "REFUNDED"
  | "FAILED"
  | "VOIDED";

export type PaymentTransactionType =
  | "AUTHORIZATION"
  | "CAPTURE"
  | "SALE"
  | "REFUND"
  | "VOID";

export type ReturnStatus =
  | "REQUESTED"
  | "APPROVED"
  | "RECEIVED"
  | "REJECTED"
  | "COMPLETED";

/**
 * Captures real-world handling outcomes for returned items.
 */
export type ReturnDisposition =
  | "RESTOCKED"
  | "DAMAGED"
  | "DISPOSED"
  | "RETURN_TO_VENDOR";

export type AllocationStatus =
  | "RESERVED"
  | "ALLOCATED"
  | "FULFILLED"
  | "RELEASED";

export type OrderHistoryActionType =
  | "CUSTOMER_PLACE"
  | "PAYMENT_RECEIVED"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "SHIPMENT_CREATED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "RETURNED"
  | "STATUS_CHANGE";

/**
 * Historical snapshot of a purchased product/variant.
 * Values stored here must not mutate if catalog items are updated or deleted.
 */
export interface OrderItem {
  id: string;

  // --- CATALOG REFERENCES ---
  productId: string;
  productVariantId?: string;

  // --- TRANSACTION SNAPSHOTS ---
  sku?: string;
  name: string; // Product title at checkout
  variantDescription?: string; // e.g. "Color: Red / Size: Medium" at checkout
  selectedOptions?: Record<string, string>; // Option-key/value-pair map
  imageUrl?: string; // Specific product or variant image snapshot

  /**
   * Snapshot of digital status at checkout. Used to verify bypass of physical shipping.
   */
  isDigital?: boolean;

  // --- FINANCIALS ---
  quantity: number;
  unitPrice: Money; // Purchase price at checkout
  lineDiscount?: Money;
  taxRate?: number;
  taxAmount?: Money;
  lineTotal: Money; // Typically: ((unitPrice * quantity) - lineDiscount) + taxAmount
}

/**
 * Maps stock allocations from specific warehouses to distinct order items.
 * Supports split-fulfillment logic.
 */
export interface InventoryAllocation {
  id: string;
  orderItemId: string;
  warehouseId: string;
  quantity: number;
  status: AllocationStatus;
  createdAt: Date;
  updatedAt?: Date;
  fulfilledAt?: Date;
  releasedAt?: Date;
}

/**
 * Represents a payment transaction linked to the order.
 * Accommodates multiple payment items (e.g. Gift Card + Credit Card).
 */
export interface Payment {
  id: string;
  provider: string; // e.g., "Stripe", "PayPal", "InternalGiftCard"
  transactionId: string;
  amount: Money;
  status: PaymentStatus;
  type: PaymentTransactionType;
  providerReference?: string; // Gateway raw authorization code or reference ID
  failureReason?: string; // Gateway raw error logs or decline reasons
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ShipmentItem {
  orderItemId: string; // Resolves historical catalog snapshots via OrderItem
  quantity: number;
}

export interface Shipment {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  originWarehouseId?: string;
  items: ShipmentItem[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface ReturnItem {
  orderItemId: string; // Resolves historical catalog snapshots via OrderItem
  quantity: number;
  reason?: string;
  refundAmount?: Money;
  disposition?: ReturnDisposition;
  restockedWarehouseId?: string;
}

export interface Return {
  id: string;
  status: ReturnStatus;
  items: ReturnItem[];
  totalRefund?: Money;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  approvedAt?: Date;
  receivedAt?: Date;
  completedAt?: Date;
}

export interface AppliedPromotion {
  id: string;
  code: string;
  description?: string;
  discountAmount: Money;
  targetType: "ORDER" | "LINE_ITEM";
  targetOrderItemIds?: string[]; // Identifies affected OrderItems
  createdAt: Date;
  updatedAt?: Date;
}

export interface OrderHistory {
  id: string;
  actionType: OrderHistoryActionType;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  notes?: string;
  updatedBy: string; // System operator, customer, or API service account identity
  createdAt: Date;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerId?: string;

  /**
   * Snapshot details for non-registered users.
   */
  customer?: GuestCustomer;

  status?: OrderStatus;
  approvalStatus?: OrderApprovalStatus;
  paymentStatus?: OrderPaymentStatus;
  fulfillmentStatus?: OrderFulfillmentStatus;

  /**
   * Master currency for the order. All nested Money sub-entities
   * inherit this currency if theirs is omitted.
   */
  currency: string; // ISO 4217 Code

  // --- RECONCILIATION TOTALS (Non-optional) ---
  subtotalAmount: Money; // Total before shipping, tax, and order discount adjustments
  taxAmount: Money;
  shippingCost: Money;
  discountAmount: Money; // Sum of order-level promotion discounts
  giftCardAmount: Money; // Total applied balance from gift cards or store credit
  loyaltyPointsAmount?: Money; // Total applied balance from store loyalty points
  totalAmount: Money; // Final customer payable amount

  /**
   * Optional if the order contains exclusively digital items.
   */
  shippingAddress?: Address;
  billingAddress?: Address;
  shippingMethod?: string;
  customerNotes?: string;
  internalNotes?: string;

  items: OrderItem[];
  allocations?: InventoryAllocation[];
  payments?: Payment[];
  shipments?: Shipment[];
  returns?: Return[];
  promotions?: AppliedPromotion[];
  history?: OrderHistory[];
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt?: Date;
  approvedAt?: Date;
  fulfilledAt?: Date;
  deletedAt?: Date;
}