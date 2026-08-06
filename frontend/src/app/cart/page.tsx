"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/store/store";
import { syncCartWithBackend } from "@/store/cartSlice";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "../firebase";

function QuantityDisplay({ qty, className }: { qty: number; className: string }) {
  const prevQtyRef = useRef(qty);
  const [animType, setAnimType] = useState<"up" | "down" | null>(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (qty !== prevQtyRef.current) {
      setAnimType(qty > prevQtyRef.current ? "up" : "down");
      setAnimKey((prev) => prev + 1);
      prevQtyRef.current = qty;
    }
  }, [qty]);

  const animationClass = animType === "up" ? "qty-up" : animType === "down" ? "qty-down" : "";

  return (
    <span
      key={animKey}
      className={`${className} ${animationClass}`}
      onAnimationEnd={() => setAnimType(null)}
    >
      {qty}
    </span>
  );
}

const getItemPrice = (price: any): number => {
  if (price && typeof price === "object" && "amount" in price) {
    return price.amount;
  }
  return typeof price === "number" ? price : Number(price) || 0;
};

function CartContent() {
  const cart = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [updatingSku, setUpdatingSku] = useState<string | null>(null);

  const handleUpdateQty = async (sku: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty <= 0) {
      handleRemoveItem(sku);
      return;
    }

    const updatedItems = cart.items.map((item) => {
      if (item.sku === sku) {
        return { ...item, qty: newQty };
      }
      return item;
    });

    const timer = setTimeout(() => {
      setUpdatingSku(sku);
    }, 250);

    try {
      await dispatch(
        syncCartWithBackend(
          updatedItems.map((item) => ({
            sku: item.sku,
            qty: item.qty,
            price: item.price,
          }))
        )
      ).unwrap();
    } catch (err) {
      console.error("Failed to update item quantity:", err);
      alert("Failed to update item quantity. Please try again.");
    } finally {
      clearTimeout(timer);
      setUpdatingSku(null);
    }
  };

  const handleRemoveItem = async (sku: string) => {
    const updatedItems = cart.items.filter((item) => item.sku !== sku);

    const timer = setTimeout(() => {
      setUpdatingSku(sku);
    }, 250);

    try {
      await dispatch(
        syncCartWithBackend(
          updatedItems.map((item) => ({
            sku: item.sku,
            qty: item.qty,
            price: item.price,
          }))
        )
      ).unwrap();
    } catch (err) {
      console.error("Failed to remove item:", err);
      alert("Failed to remove item. Please try again.");
    } finally {
      clearTimeout(timer);
      setUpdatingSku(null);
    }
  };

  const handleCheckoutInit = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated Firebase user.");
      const token = await user.getIdToken();

      const res = await fetch("/api/v1/checkout/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source_cart_version: cart.cartVersion,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Checkout failed: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.status === "success" && data.data?.checkout_id) {
        // Redirection to mock stripe checkout or custom flow
        // Let's call payment endpoint to redirect directly to Stripe
        const stripeRes = await fetch("/api/v1/payments/stripe/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            checkout_id: data.data.checkout_id,
          }),
        });

        if (!stripeRes.ok) {
          const stripeErrorData = await stripeRes.json().catch(() => ({}));
          throw new Error(stripeErrorData.message || stripeErrorData.error || `Failed to initialize payment gateway: ${stripeRes.statusText}`);
        }

        const stripeData = await stripeRes.json();
        if (stripeData.url) {
          window.location.href = stripeData.url;
        } else {
          throw new Error("Failed to create stripe checkout session URL.");
        }
      } else {
        throw new Error(data.message || "Failed to initialize checkout.");
      }
    } catch (err: any) {
      console.error("Checkout init error:", err);
      setCheckoutError(err.message || "Checkout failed. Please try again.");
      setCheckoutLoading(false);
    }
  };

  const subtotal = cart.items.reduce((sum, item) => sum + getItemPrice(item.price) * item.qty, 0);

  return (
    <div className="min-h-screen bg-background text-on-background transition-colors duration-300">
      {/* Header Banner */}
      <header className="sticky top-0 z-10 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/products" className="flex items-center gap-2 group">
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-bold text-sm uppercase tracking-wider">Back to Products</span>
          </Link>
          <h1 className="text-xl font-black uppercase tracking-tight">Shopping Cart</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {cart.items.length === 0 ? (
          /* Empty Cart State */
          <div className="max-w-md mx-auto text-center bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 shadow-sm mt-8">
            <svg className="w-16 h-16 text-on-surface-variant/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h2 className="text-xl font-bold text-on-background mb-2">Your Cart is Empty</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              Looks like you haven&apos;t added any items to your shopping cart yet.
            </p>
            <Link href="/products" className="inline-block bg-primary text-on-primary font-bold px-6 py-2.5 rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
              Start Shopping
            </Link>
          </div>
        ) : (
          /* Cart Details Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items Column */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Placeholder / Image */}
                    <div className="w-20 h-20 bg-surface-container rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                      {item.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.imageUrl} alt={item.sku} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/40">MUG</span>
                      )}
                    </div>
                    
                    {/* Product Metadata */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-on-background line-clamp-1">
                        {item.productName || item.name || item.sku}
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        SKU: <span className="font-semibold">{item.sku}</span>
                      </p>
                      {item.stockQuantity !== undefined && (
                        <p className="text-[11px]">
                          {item.stockQuantity > 0 ? (
                            <span className="text-emerald-600 font-semibold">In Stock ({item.stockQuantity})</span>
                          ) : item.allowBackorder ? (
                            <span className="text-amber-600 font-semibold">Backordered (allow backorder)</span>
                          ) : (
                            <span className="text-red-600 font-semibold">Out of Stock</span>
                          )}
                        </p>
                      )}
                      <p className="text-sm font-extrabold text-on-background">
                        ${getItemPrice(item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Actions & Price */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                    {/* Quantity selectors */}
                    <div className="flex items-center gap-2 border border-outline rounded-lg p-1 bg-surface relative">
                      <button
                        onClick={() => handleUpdateQty(item.sku, item.qty, -1)}
                        disabled={updatingSku === item.sku}
                        className="w-7 h-7 flex items-center justify-center font-bold text-on-surface hover:bg-surface-container rounded transition-colors disabled:opacity-40"
                      >
                        -
                      </button>
                      
                      {updatingSku === item.sku ? (
                        <div className="w-8 flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface-tint/30 border-t-surface-tint"></div>
                        </div>
                      ) : (
                        <QuantityDisplay qty={item.qty} className="w-8 text-center text-xs font-bold" />
                      )}

                      <button
                        onClick={() => handleUpdateQty(item.sku, item.qty, 1)}
                        disabled={updatingSku === item.sku}
                        className="w-7 h-7 flex items-center justify-center font-bold text-on-surface hover:bg-surface-container rounded transition-colors disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <style>{`
                      @keyframes qtyUp {
                        0% {
                          transform: translateY(0) scale(1);
                          opacity: 1;
                        }
                        30% {
                          transform: translateY(-24px) scale(0.7);
                          opacity: 0;
                        }
                        35% {
                          transform: translateY(24px) scale(0.7);
                          opacity: 0;
                        }
                        100% {
                          transform: translateY(0) scale(1);
                          opacity: 1;
                        }
                      }
                      @keyframes qtyDown {
                        0% {
                          transform: translateY(0) scale(1);
                          opacity: 1;
                        }
                        30% {
                          transform: translateY(24px) scale(0.7);
                          opacity: 0;
                        }
                        35% {
                          transform: translateY(-24px) scale(0.7);
                          opacity: 0;
                        }
                        100% {
                          transform: translateY(0) scale(1);
                          opacity: 1;
                        }
                      }
                      .qty-up {
                        display: inline-block;
                        animation: qtyUp 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
                      }
                      .qty-down {
                        display: inline-block;
                        animation: qtyDown 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
                      }
                    `}</style>

                    {/* Total Price & Delete */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-on-background w-20 text-right">
                        ${(getItemPrice(item.price) * item.qty).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.sku)}
                        className="p-1.5 border border-outline hover:bg-error-container hover:text-on-error-container text-on-surface-variant rounded-lg transition-colors"
                        aria-label="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Summary Column */}
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-sm h-fit space-y-6">
              <h2 className="text-lg font-bold text-on-background">Order Summary</h2>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant font-medium">Subtotal</span>
                  <span className="font-bold text-on-background">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant font-medium">Estimated Shipping</span>
                  <span className="text-emerald-600 font-semibold uppercase">Free</span>
                </div>
                <div className="border-t border-outline-variant pt-4 flex justify-between text-base">
                  <span className="font-extrabold text-on-background">Total</span>
                  <span className="font-black text-lg text-on-background">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              {checkoutError && (
                <div className="bg-error-container border border-error/30 text-on-error-container p-3 rounded-lg text-xs font-semibold">
                  {checkoutError}
                </div>
              )}

              <button
                onClick={handleCheckoutInit}
                disabled={checkoutLoading}
                className="w-full h-12 bg-primary hover:bg-primary/95 text-on-primary font-bold uppercase tracking-wider text-sm rounded-xl transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"></div>
                ) : (
                  "Proceed to Checkout"
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CartPage() {
  return (
    <ProtectedRoute>
      <CartContent />
    </ProtectedRoute>
  );
}
