"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/store";
import { syncCartWithBackend } from "@/store/cartSlice";
import ProtectedRoute from "@/components/ProtectedRoute";
import { auth } from "../firebase";
import Link from "next/link";

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

interface ProductPrice {
  amount: number;
  currency: string;
}

interface ProductVariant {
  id: string;
  sku?: string;
  stockQuantity?: number;
  price?: ProductPrice;
  imageUrl?: string;
  attributes?: Record<string, any>;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sku?: string;
  price: ProductPrice;
  imageUrl: string;
  stockQuantity?: number;
  inventoryMode: string;
  variants?: ProductVariant[];
}

function ProductDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const productId = searchParams.get("id");

  const cart = useAppSelector((state) => state.cart);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    if (!productId) {
      setError("No Product ID specified.");
      setLoading(false);
      return;
    }

    let active = true;
    async function fetchProductDetails() {
      setLoading(true);
      setError(null);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated Firebase user.");
        const token = await user.getIdToken();

        const res = await fetch(`/api/v1/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch product details: ${res.status}`);
        }

        const data = await res.json();
        if (active) {
          if (data.status === "success" && data.data?.product) {
            const prod = data.data.product;
            if (prod.status === 'ARCHIVED') {
              throw new Error("This product has been archived and is no longer available.");
            }
            setProduct(prod);
            if (prod.variants && prod.variants.length > 0) {
              setSelectedVariant(prod.variants[0]);
            }
          } else {
            throw new Error(data.message || "Product not found.");
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "An error occurred.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchProductDetails();
    return () => {
      active = false;
    };
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product) return;

    // Use variant SKU if variant is selected/present, otherwise fallback to product SKU or ID
    const sku = selectedVariant?.sku || product.sku || product.id;
    const priceAmount = selectedVariant?.price?.amount ?? product.price.amount;

    setSuccessMessage(false);

    const timer = setTimeout(() => {
      setAddingToCart(true);
    }, 250);

    try {
      // Find if item is already in cart
      const currentItems = [...cart.items];
      const existingItemIndex = currentItems.findIndex((item) => item.sku === sku);

      if (existingItemIndex > -1) {
        // Create a copy of the item and update its quantity
        const updatedItem = {
          ...currentItems[existingItemIndex],
          qty: currentItems[existingItemIndex].qty + quantity,
        };
        currentItems[existingItemIndex] = updatedItem;
      } else {
        currentItems.push({
          sku,
          qty: quantity,
          price: priceAmount,
          name: product.name,
          imageUrl: selectedVariant?.imageUrl || product.imageUrl,
        });
      }

      // Sync with backend
      await dispatch(syncCartWithBackend(currentItems.map(item => ({
        sku: item.sku,
        qty: item.qty,
        price: item.price
      })))).unwrap();

      setSuccessMessage(true);
      setTimeout(() => {
        setSuccessMessage(false);
      }, 3000);
    } catch (err) {
      console.error("Add to cart error:", err);
      alert("Failed to add item to cart. Please try again.");
    } finally {
      clearTimeout(timer);
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center">
        <div className="animate-pulse space-y-8 w-full max-w-5xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-96 bg-surface-container rounded-2xl"></div>
            <div className="space-y-4">
              <div className="h-8 bg-surface-container rounded w-3/4"></div>
              <div className="h-4 bg-surface-container rounded w-1/2"></div>
              <div className="h-24 bg-surface-container rounded"></div>
              <div className="h-10 bg-surface-container rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-surface-container-lowest border border-outline-variant p-8 rounded-2xl shadow-lg">
          <svg className="w-16 h-16 text-error mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold mb-2">Error Loading Product</h2>
          <p className="text-sm text-on-surface-variant mb-6">{error || "Product could not be found."}</p>
          <Link href="/products" className="inline-block bg-primary text-on-primary font-bold px-6 py-2 rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = selectedVariant?.price ?? product.price;
  const currentImage = selectedVariant?.imageUrl ?? product.imageUrl;
  const stockQty = selectedVariant?.stockQuantity ?? product.stockQuantity ?? 0;
  const isOutOfStock = stockQty <= 0;

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
          <Link href="/cart" className="relative p-2 bg-surface hover:bg-surface-container rounded-full border border-outline transition-colors">
            <svg className="w-6 h-6 text-on-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cart.items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-surface-tint text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {cart.items.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-surface-container-lowest p-6 sm:p-10 rounded-3xl border border-outline-variant shadow-lg">
          
          {/* Gallery / Image Showcase */}
          <div className="relative w-full h-96 sm:h-[480px] bg-surface-container rounded-2xl overflow-hidden flex items-center justify-center">
            {currentImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-on-surface-variant/40 flex flex-col items-center">
                <svg className="h-16 w-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs uppercase font-bold tracking-wider">No Image Available</span>
              </div>
            )}
            
            {/* Status Badge */}
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${isOutOfStock ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container"}`}>
                {isOutOfStock ? "Out of Stock" : `In Stock (${stockQty})`}
              </span>
            </div>
          </div>

          {/* Details Content */}
          <div className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-surface-tint">
                Product Details
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-on-background mb-4">
                {product.name}
              </h1>

              {/* Price Tag */}
              <div className="text-2xl font-black text-on-background mb-6">
                {currentPrice.currency === "USD" ? "$" : ""}
                {currentPrice.amount.toFixed(2)}
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed text-on-surface-variant mb-6">
                {product.description || "No product description available."}
              </p>

              {/* Variants Selection (if any) */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                    Select Option
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      // Generate option name from attributes if possible, else use ID/SKU
                      const name = v.attributes ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(", ") : v.sku || v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`px-4 py-2 text-xs font-bold border rounded-lg transition-all ${
                            isSelected
                              ? "bg-primary-container text-on-primary-container border-surface-tint shadow-sm"
                              : "bg-surface border-outline hover:bg-surface-container"
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="mb-8">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                    Quantity
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={quantity <= 1 || addingToCart}
                      onClick={() => setQuantity(quantity - 1)}
                      className="w-10 h-10 border border-outline rounded-lg flex items-center justify-center font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
                    >
                      -
                    </button>
                    {addingToCart ? (
                      <div className="w-12 flex items-center justify-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface-tint/30 border-t-surface-tint"></div>
                      </div>
                    ) : (
                      <QuantityDisplay qty={quantity} className="w-12 text-center font-extrabold text-base" />
                    )}
                    <button
                      disabled={quantity >= stockQty || addingToCart}
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 border border-outline rounded-lg flex items-center justify-center font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
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
                </div>
              )}
            </div>

            {/* Action Area */}
            <div className="space-y-4 pt-6 border-t border-outline-variant/60">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
                className="w-full h-12 bg-primary hover:bg-primary/95 text-on-primary font-bold uppercase tracking-wider text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {addingToCart ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"></div>
                ) : isOutOfStock ? (
                  "Sold Out"
                ) : (
                  "Add to Cart"
                )}
              </button>

              {successMessage && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg text-center text-xs font-semibold animate-fade-in flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Added successfully! View in your Cart.
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProductDetailsPage() {
  return (
    <ProtectedRoute>
      <ProductDetailsContent />
    </ProtectedRoute>
  );
}
