'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import type { CheckoutSnapshot } from '../../../models/types/cart.types';
import Spinner from '../components/Spinner';

type CheckoutFilterStatus = 'live' | 'expired' | 'completed' | 'all';

export default function AdminLiveCheckoutsPage() {
  const [checkouts, setCheckouts] = useState<CheckoutSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutSnapshot | null>(null);
  const [statusFilter, setStatusFilter] = useState<CheckoutFilterStatus>('live');

  const fetchCheckouts = async (filter: CheckoutFilterStatus = statusFilter) => {
    try {
      setLoading(true);
      setError(null);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/v1/checkouts/live-locked?status=${filter}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch checkouts');
      }

      const json = await res.json();
      setCheckouts(json.data.checkouts || []);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchCheckouts(statusFilter);
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          fetchCheckouts(statusFilter);
        }
      });
      return () => unsubscribe();
    }
  }, [statusFilter]);

  const calculateStatusBadge = (checkout: CheckoutSnapshot) => {
    const exp = new Date(checkout.expires_at).getTime();
    const now = Date.now();
    
    if (checkout.status === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          Completed
        </span>
      );
    }

    if (checkout.status === 'expired' || exp <= now) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          Expired
        </span>
      );
    }

    const diff = exp - now;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        Live ({mins}m {secs}s)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Checkouts</h1>
          <p className="text-slate-500 text-sm mt-1">
            View live locked, expired, and historical checkout sessions with snapshot items.
          </p>
        </div>
        <button
          onClick={() => fetchCheckouts(statusFilter)}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          Refresh List
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStatusFilter('live')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === 'live'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Live Locked
        </button>
        <button
          onClick={() => setStatusFilter('expired')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === 'expired'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Expired
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === 'completed'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Checkouts
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Checkout ID</th>
                  <th className="px-6 py-4">Customer ID</th>
                  <th className="px-6 py-4">Locked Total</th>
                  <th className="px-6 py-4">Locked Items</th>
                  <th className="px-6 py-4">Status / Expiration</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {checkouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No checkouts found matching the selected filter option ({statusFilter}).
                    </td>
                  </tr>
                ) : (
                  checkouts.map((checkout) => (
                    <tr key={checkout.checkout_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-900">
                        {checkout.checkout_id}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {checkout.user_id}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        ${checkout.snapshot.locked_total.amount.toFixed(2)} {checkout.snapshot.locked_total.currency}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {checkout.snapshot.locked_items.length} items
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {calculateStatusBadge(checkout)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedCheckout(checkout)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs hover:underline"
                        >
                          View Snapshot
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      {selectedCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Checkout Details</h2>
              <button
                onClick={() => setSelectedCheckout(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <span className="font-semibold text-slate-900">Checkout ID:</span>{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-800">{selectedCheckout.checkout_id}</code>
              </div>
              <div>
                <span className="font-semibold text-slate-900">Customer ID:</span> {selectedCheckout.user_id}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Source Cart Version:</span> {selectedCheckout.snapshot.source_cart_version}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Status:</span>{' '}
                <span className="capitalize">{selectedCheckout.status}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-900">Expires At:</span> {new Date(selectedCheckout.expires_at).toLocaleString()}
              </div>

              <div className="pt-2">
                <h3 className="font-semibold text-slate-900 mb-2">Locked Items ({selectedCheckout.snapshot.locked_items.length})</h3>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 divide-y divide-slate-200">
                  {selectedCheckout.snapshot.locked_items.map((item, idx) => (
                    <div key={idx} className="py-2 first:pt-0 last:pb-0 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-medium text-slate-800">SKU: {item.sku}</span>
                        <span className="text-slate-500 block">Qty: {item.qty}</span>
                      </div>
                      <div className="font-semibold text-slate-900">
                        ${item.locked_price.amount.toFixed(2)} {item.locked_price.currency}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 font-bold text-slate-900 text-base">
                <span>Total Locked Amount:</span>
                <span>${selectedCheckout.snapshot.locked_total.amount.toFixed(2)} {selectedCheckout.snapshot.locked_total.currency}</span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedCheckout(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
