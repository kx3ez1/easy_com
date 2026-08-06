'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return true;
  });

  const toggleSidebar = (value?: boolean) => {
    setSidebarOpen((prev) => {
      const nextState = value !== undefined ? value : !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_sidebar_open', String(nextState));
      }
      return nextState;
    });
  };

  useEffect(() => {
    // In a real implementation, you would verify the user role with the backend here,
    // or decode a custom claim from the Firebase token.
    // For this demonstration, we are just waiting for auth to settle.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Assume verified admin for now, or fetch from backend API
        try {
          const token = await user.getIdToken();
          const res = await fetch('/api/v1/users/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data?.data?.profile?.role === 'ADMIN') {
            setIsAdmin(true);
          } else {
            window.location.href = '/'; // Redirect non-admins
          }
        } catch {
          window.location.href = '/';
        }
      } else {
        window.location.href = '/login';
      }
    });

    return () => unsubscribe();
  }, []);

  if (isAdmin === null) {
    return <div className="flex h-screen w-full items-center justify-center text-xl">Verifying Admin Access...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden relative">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
        } bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 ease-in-out shrink-0 z-20`}
      >
        <div className="p-6 text-2xl font-bold tracking-wider border-b border-slate-700 flex justify-between items-center">
          <span>ADMIN</span>
          <button
            onClick={() => toggleSidebar(false)}
            className="md:hidden text-slate-400 hover:text-white focus:outline-none"
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className={`block px-4 py-2 rounded transition-colors ${pathname === '/admin' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            Dashboard
          </Link>
          <Link href="/admin/users" className={`block px-4 py-2 rounded transition-colors ${pathname.startsWith('/admin/users') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            Users
          </Link>
          <Link href="/admin/products" className={`block px-4 py-2 rounded transition-colors ${pathname.startsWith('/admin/products') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            Products
          </Link>
          <Link href="/admin/orders" className={`block px-4 py-2 rounded transition-colors ${pathname.startsWith('/admin/orders') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            Orders
          </Link>
          <Link href="/admin/checkouts" className={`block px-4 py-2 rounded transition-colors ${pathname.startsWith('/admin/checkouts') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            Checkouts
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <Link href="/" className="block px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            &larr; Back to Store
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 shrink-0 shadow-sm">
          <button
            onClick={() => toggleSidebar()}
            className="p-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none transition-colors"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            aria-label="Toggle sidebar panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-800">Admin Portal</h1>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
