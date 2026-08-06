"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAppSelector } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface ProductPrice {
  amount: number;
  currency: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: ProductPrice;
  imageUrl?: string;
  stockQuantity: number;
  status: string;
}

function ProductsContent() {
  const { user } = useAppSelector((state) => state.auth);
  const cart = useAppSelector((state) => state.cart);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch products
  useEffect(() => {
    let active = true;

    async function fetchProducts() {
      setLoadingProducts(true);
      setErrorProducts(null);

      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("No authenticated Firebase user found.");
        }

        const token = await currentUser.getIdToken();
        const url = new URL("/api/v1/products", window.location.origin);
        if (debouncedSearch) {
          url.searchParams.append("search", debouncedSearch);
        }

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        if (active) {
          if (data.status === "success" && (data.data?.results || data.data?.products)) {
            const rawProducts: Product[] = data.data.results || data.data.products;
            const activeProducts = rawProducts.filter((p) => p.status === 'ACTIVE' || (!p.status && p.status !== 'ARCHIVED'));
            setProducts(activeProducts);
          } else {
            throw new Error(data.message || data.error || "Failed to retrieve products list.");
          }
        }
      } catch (err: any) {
        if (active) {
          console.error("Error loading products:", err);
          setErrorProducts(err.message || "Something went wrong while fetching products.");
        }
      } finally {
        if (active) {
          setLoadingProducts(false);
        }
      }
    }

    fetchProducts();

    return () => {
      active = false;
    };
  }, [debouncedSearch, user]);

  return (
    <div className="min-h-screen bg-background text-on-background transition-colors duration-300">
      {/* Header Banner */}
      <header className="sticky top-0 z-10 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            {/* Brand Logo / Title */}
            <div className="flex items-center gap-2 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-surface-tint">
                  EasyCom Store
                </span>
                <h1 className="text-2xl font-[800] uppercase tracking-tight text-on-background">
                  Products
                </h1>
              </div>
            </div>

            {/* Desktop & Tablet Amazon-like Long Search Bar */}
            <div className="hidden md:flex flex-1 max-w-xl lg:max-w-2xl mx-4">
              <div className="flex w-full rounded-lg overflow-hidden border border-outline focus-within:ring-2 focus-within:ring-surface-tint focus-within:border-transparent transition-all duration-200">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by name, code or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2.5 px-4 bg-surface text-on-background placeholder-on-surface-variant/50 focus:outline-none text-sm"
                  />
                </div>
                <button 
                  className="bg-primary-container hover:bg-primary-container/90 text-on-primary-container px-6 flex items-center justify-center transition-colors"
                  aria-label="Search"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <Link href="/profile" className="text-right hidden md:block group hover:opacity-80 transition-opacity">
                <p className="text-[10px] uppercase font-bold text-surface-tint tracking-wider group-hover:underline">My Profile</p>
                <p className="text-sm font-semibold text-on-surface">{user?.email}</p>
              </Link>

              <Link href="/profile" className="p-2 bg-surface hover:bg-surface-container rounded-full border border-outline transition-colors" aria-label="Profile">
                <svg className="w-5 h-5 text-on-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>

              <Link href="/cart" className="relative p-2 bg-surface hover:bg-surface-container rounded-full border border-outline transition-colors" aria-label="Cart">
                <svg className="w-5 h-5 text-on-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cart.items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-surface-tint text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {cart.items.reduce((sum, item) => sum + item.qty, 0)}
                  </span>
                )}
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-lg bg-surface border border-outline py-2 px-4 text-xs font-bold uppercase tracking-wider text-on-background transition-all duration-200 hover:bg-surface-container-low"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile Search Bar (under logo on small screens) */}
          <div className="md:hidden flex w-full">
            <div className="flex w-full rounded-lg overflow-hidden border border-outline focus-within:ring-2 focus-within:ring-surface-tint focus-within:border-transparent transition-all duration-200">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2.5 px-4 bg-surface text-on-background placeholder-on-surface-variant/50 focus:outline-none text-sm"
                />
              </div>
              <button 
                className="bg-primary-container text-on-primary-container px-5 flex items-center justify-center"
                aria-label="Search"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Dynamic List Section */}
        {loadingProducts ? (
          /* Premium Skeleton Loader */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant animate-pulse space-y-4"
              >
                <div className="w-full h-48 bg-surface-container rounded-lg"></div>
                <div className="h-4 bg-surface-container rounded w-3/4"></div>
                <div className="h-3 bg-surface-container rounded w-1/2"></div>
                <div className="h-6 bg-surface-container rounded w-1/4 pt-2"></div>
              </div>
            ))}
          </div>
        ) : errorProducts ? (
          /* Error State */
          <div className="rounded-xl border border-error bg-error-container p-6 text-on-error-container max-w-lg">
            <h3 className="font-bold text-lg mb-2">Failed to Load Catalog</h3>
            <p className="text-sm mb-4">{errorProducts}</p>
            <button
              onClick={() => {
                setDebouncedSearch(searchQuery);
              }}
              className="px-4 py-2 bg-error text-on-error text-xs font-bold uppercase rounded-lg hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center max-w-md mx-auto">
            <svg
              className="mx-auto h-12 w-12 text-on-surface-variant/40 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="font-bold text-lg text-on-background mb-1">No products found</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              We couldn&apos;t find any items matching your search criteria.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-primary-container text-on-primary-container text-xs font-bold uppercase rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product?id=${product.id}`}
                className="group flex flex-col bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-md hover:shadow-xl hover:border-surface-tint transition-all duration-300 cursor-pointer"
              >
                {/* Image / Placeholder */}
                <div className="relative w-full h-48 mb-4 bg-surface-container rounded-lg overflow-hidden flex items-center justify-center">
                  {product.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-on-surface-variant/40">
                      <svg
                        className="h-12 w-12 mb-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-[10px] uppercase font-bold tracking-wider">No Image Available</span>
                    </div>
                  )}

                  {/* Stock Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    {product.stockQuantity > 0 ? (
                      <span className="bg-primary-container text-on-primary-container text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        In Stock ({product.stockQuantity})
                      </span>
                    ) : (
                      <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <h3 className="font-bold text-base text-on-background line-clamp-1 mb-1">
                  {product.name}
                </h3>
                
                <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 flex-grow">
                  {product.description || "No description provided."}
                </p>

                {/* Price & Action */}
                <div className="flex items-center justify-between pt-2 mt-auto border-t border-outline-variant/50">
                  <div>
                    <span className="text-[10px] font-semibold text-on-surface-variant block uppercase leading-none">Price</span>
                    <span className="text-lg font-extrabold text-on-background">
                      {product.price.currency === "USD" ? "$" : ""}
                      {product.price.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}
