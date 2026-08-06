'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import Pagination from '../components/Pagination';
import type { Order, OrderStatus, OrderPaymentStatus } from '../../../models/types/order.types';

import Autocomplete, { AutocompleteOption } from '../components/Autocomplete';
import type { UserProfile } from '../../../models/types/user.types';
import type { Product } from '../../../models/types/catalog.types';

import Spinner from '../components/Spinner';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Autocomplete options
  const [userOptions, setUserOptions] = useState<AutocompleteOption[]>([]);
  const [productOptions, setProductOptions] = useState<AutocompleteOption[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Modification state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  // Create Order State
  const [showCreate, setShowCreate] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    customerId: '',
    currency: 'USD',
    items: [{ id: 'item-1', productId: '', name: 'Manual Item', quantity: 1, unitPrice: { amount: 0, currency: 'USD' }, lineTotal: { amount: 0, currency: 'USD' } }],
    shippingAddress: { recipientName: '', addressLine1: '', city: '', stateProvince: '', postalCode: '', countryCode: 'US' },
    paymentStatus: 'PENDING' as OrderPaymentStatus,
    status: 'PENDING' as OrderStatus,
    subtotalAmount: { amount: 0, currency: 'USD' },
    taxAmount: { amount: 0, currency: 'USD' },
    shippingCost: { amount: 0, currency: 'USD' },
    discountAmount: { amount: 0, currency: 'USD' },
    giftCardAmount: { amount: 0, currency: 'USD' },
    totalAmount: { amount: 0, currency: 'USD' },
  });
  const [creating, setCreating] = useState(false);

  // Fetch users & products for autocompletion
  useEffect(() => {
    async function loadAutocompleteData() {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        // Fetch users
        const usersRes = await fetch('/api/admin/v1/users?limit=100', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const usersJson = await usersRes.json();
          const opts: AutocompleteOption[] = (usersJson.data.results || []).map((u: UserProfile) => ({
            id: u.id,
            label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            sublabel: `${u.email} • Role: ${u.role}`,
            data: u
          }));
          setUserOptions(opts);
        }

        // Fetch products
        const productsRes = await fetch('/api/admin/v1/products?limit=100', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (productsRes.ok) {
          const productsJson = await productsRes.json();
          const opts: AutocompleteOption[] = (productsJson.data.results || []).map((p: Product) => ({
            id: p.id,
            label: p.name,
            sublabel: `$${p.price?.amount?.toFixed(2) || '0.00'} • Stock: ${p.stockQuantity || 0}`,
            data: p
          }));
          setProductOptions(opts);
        }
      } catch (e) {
        console.error('Error fetching autocomplete options:', e);
      }
    }

    if (showCreate) {
      loadAutocompleteData();
    }
  }, [showCreate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const searchParams = new URLSearchParams(window.location.search);
      const userIdParam = searchParams.get('userId');
      const queryStr = userIdParam 
        ? `limit=${limit}&offset=${offset}&userId=${encodeURIComponent(userIdParam)}`
        : `limit=${limit}&offset=${offset}`;

      const res = await fetch(`/api/admin/v1/orders?${queryStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch orders');
      const json = await res.json();
      setOrders(json.data.results);
      setTotal(json.data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchOrders();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchOrders();
      });
      return () => unsubscribe();
    }
  }, [offset, limit]);

  const handleUpdateStatus = async (id: string, type: 'status' | 'payment', value: string) => {
    if (!confirm(`Are you sure you want to update the ${type}?`)) return;
    
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const endpoint = type === 'status' ? `/api/admin/v1/orders/${id}/status` : `/api/admin/v1/orders/${id}/payment`;
      const body = type === 'status' ? { status: value } : { paymentStatus: value };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) throw new Error(`Failed to update ${type}`);
      await fetchOrders();
      setEditingOrder(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/v1/orders/${id}/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete order');
      fetchOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filterUserId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('userId') : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Manage Orders</h1>
          {filterUserId && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm bg-blue-100 text-blue-800 font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
                Filtered by User: <code className="font-mono text-xs">{filterUserId}</code>
                <a 
                  href="/admin/orders" 
                  className="hover:text-blue-900 font-bold ml-1 text-base leading-none"
                  title="Clear user filter"
                >
                  ×
                </a>
              </span>
            </div>
          )}
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          Create Order
        </button>
      </div>
      
      {error && <div className="text-red-500 mb-4">Error: {error}</div>}
      
      {loading ? (
        <Spinner size="lg" label="Loading orders..." className="my-16" />
      ) : orders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-medium text-slate-500">No orders found</h2>
          <p className="text-slate-400 mt-2">There are currently 0 orders.</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{order.customerId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">${order.totalAmount?.amount?.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select 
                        className="border border-slate-300 rounded text-xs p-1 bg-transparent"
                        value={order.status || 'PENDING'}
                        onChange={(e) => handleUpdateStatus(order.id, 'status', e.target.value)}
                        disabled={saving}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                       <select 
                        className="border border-slate-300 rounded text-xs p-1 bg-transparent"
                        value={order.paymentStatus || 'PENDING'}
                        onChange={(e) => handleUpdateStatus(order.id, 'payment', e.target.value)}
                        disabled={saving}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="FAILED">FAILED</option>
                        <option value="REFUNDED">REFUNDED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className="text-blue-600 font-medium cursor-pointer hover:underline mr-3">
                        View Details
                      </span>
                      <button onClick={() => handleDelete(order.id)} className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <Pagination limit={limit} offset={offset} total={total} onPageChange={setOffset} />
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Order</h2>
            <div className="space-y-4">
              <div>
                <Autocomplete
                  label="Customer"
                  placeholder="Type to search user by name, email or ID..."
                  value={newOrder.customerId || ''}
                  options={userOptions}
                  onChange={(val, selected) => {
                    const updatedAddress = selected?.data ? {
                      recipientName: `${selected.data.firstName || ''} ${selected.data.lastName || ''}`.trim() || selected.data.email,
                      addressLine1: selected.data.addresses?.[0]?.addressLine1 || '',
                      city: selected.data.addresses?.[0]?.city || '',
                      stateProvince: selected.data.addresses?.[0]?.stateProvince || '',
                      postalCode: selected.data.addresses?.[0]?.postalCode || '',
                      countryCode: selected.data.addresses?.[0]?.countryCode || 'US'
                    } : newOrder.shippingAddress;

                    setNewOrder({
                      ...newOrder,
                      customerId: val,
                      shippingAddress: updatedAddress as any
                    });
                  }}
                />
              </div>

              <div>
                <Autocomplete
                  label="Product (First Item)"
                  placeholder="Type to search product by name or ID..."
                  value={newOrder.items?.[0]?.productId || ''}
                  options={productOptions}
                  onChange={(val, selected) => {
                    const items = [...(newOrder.items || [])] as any[];
                    if (!items[0]) items[0] = { id: '1', productId: '', name: 'Item', quantity: 1, unitPrice: { amount: 0, currency: 'USD' }, lineTotal: { amount: 0, currency: 'USD' } };
                    
                    items[0].productId = val;
                    if (selected?.data) {
                      items[0].name = selected.data.name;
                      items[0].unitPrice = { amount: selected.data.price?.amount || 0, currency: selected.data.price?.currency || 'USD' };
                      items[0].lineTotal.amount = items[0].quantity * items[0].unitPrice.amount;
                    }

                    setNewOrder({ ...newOrder, items });
                  }}
                />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm">Quantity</label>
                  <input type="number" className="w-full border border-slate-300 p-2 rounded mt-1" value={newOrder.items?.[0]?.quantity || 1} onChange={e => {
                    const items = [...(newOrder.items || [])] as any[];
                    if (!items[0]) items[0] = { id: '1', productId: '', name: 'Item', quantity: 1, unitPrice: { amount: 0, currency: 'USD' }, lineTotal: { amount: 0, currency: 'USD' } };
                    items[0].quantity = parseInt(e.target.value) || 1;
                    items[0].lineTotal.amount = items[0].quantity * items[0].unitPrice.amount;
                    setNewOrder({...newOrder, items});
                  }} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm">Price per item (USD)</label>
                  <input type="number" className="w-full border border-slate-300 p-2 rounded mt-1" value={newOrder.items?.[0]?.unitPrice?.amount || 0} onChange={e => {
                    const items = [...(newOrder.items || [])] as any[];
                    if (!items[0]) items[0] = { id: '1', productId: '', name: 'Item', quantity: 1, unitPrice: { amount: 0, currency: 'USD' }, lineTotal: { amount: 0, currency: 'USD' } };
                    items[0].unitPrice.amount = parseFloat(e.target.value) || 0;
                    items[0].lineTotal.amount = items[0].quantity * items[0].unitPrice.amount;
                    setNewOrder({...newOrder, items});
                  }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mt-4">Shipping Address</label>
                <input placeholder="Recipient Name" className="w-full border border-slate-300 p-2 rounded mt-1" value={newOrder.shippingAddress?.recipientName || ''} onChange={e => setNewOrder({...newOrder, shippingAddress: {...(newOrder.shippingAddress as any), recipientName: e.target.value}})} />
                <input placeholder="Street (Address Line 1)" className="w-full border border-slate-300 p-2 rounded mt-2" value={newOrder.shippingAddress?.addressLine1 || ''} onChange={e => setNewOrder({...newOrder, shippingAddress: {...(newOrder.shippingAddress as any), addressLine1: e.target.value}})} />
                <div className="flex space-x-2 mt-2">
                  <input placeholder="City" className="w-full border border-slate-300 p-2 rounded" value={newOrder.shippingAddress?.city || ''} onChange={e => setNewOrder({...newOrder, shippingAddress: {...(newOrder.shippingAddress as any), city: e.target.value}})} />
                  <input placeholder="State" className="w-full border border-slate-300 p-2 rounded" value={newOrder.shippingAddress?.stateProvince || ''} onChange={e => setNewOrder({...newOrder, shippingAddress: {...(newOrder.shippingAddress as any), stateProvince: e.target.value}})} />
                  <input placeholder="Postal Code" className="w-full border border-slate-300 p-2 rounded" value={newOrder.shippingAddress?.postalCode || ''} onChange={e => setNewOrder({...newOrder, shippingAddress: {...(newOrder.shippingAddress as any), postalCode: e.target.value}})} />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded" disabled={creating}>Cancel</button>
              <button onClick={async () => {
                setCreating(true);
                try {
                  const token = await auth.currentUser?.getIdToken();
                  
                  // Calculate total amount for payload
                  const total = (newOrder.items || []).reduce((acc, item) => acc + ((item.unitPrice?.amount || 0) * item.quantity), 0);
                  const orderPayload = {
                    ...newOrder,
                    subtotalAmount: { amount: total, currency: 'USD' },
                    totalAmount: { amount: total, currency: 'USD' },
                  };

                  const res = await fetch('/api/admin/v1/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(orderPayload)
                  });
                  if (!res.ok) throw new Error('Failed to create order');
                  setShowCreate(false);
                  fetchOrders();
                } catch (err: any) {
                  alert(err.message);
                } finally {
                  setCreating(false);
                }
              }} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
