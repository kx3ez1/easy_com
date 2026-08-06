'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import Pagination from '../components/Pagination';
import type { Product, ProductStatus } from '../../../models/types/catalog.types';
import type { Money } from '../../../models/types/shared.types';

import Spinner from '../components/Spinner';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);


  const [error, setError] = useState<string | null>(null);
  // Create Product State
  const [showCreate, setShowCreate] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    slug: '',
    description: '',
    price: { amount: 0, currency: 'USD' },
    stockQuantity: 0,
    inventoryMode: 'SIMPLE',
    imageUrl: '',
    status: 'ACTIVE'
  });
  const [creating, setCreating] = useState(false);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/admin/v1/products?limit=${limit}&offset=${offset}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch products');
        const json = await res.json();
        setProducts(json.data.results);
        setTotal(json.data.total);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/v1/products/${id}/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete product');
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchProducts();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchProducts();
      });
      return () => unsubscribe();
    }
  }, [offset, limit]);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Products</h1>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          Add Product
        </button>
      </div>
      
      {error && <div className="text-red-500 mb-4">Error: {error}</div>}
      
      {loading ? (
        <Spinner size="lg" label="Loading products..." className="my-16" />
      ) : products.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-medium text-slate-500">No products found</h2>
          <p className="text-slate-400 mt-2">There are currently 0 products in the catalog.</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inventory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{product.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${product.price?.amount?.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{product.stockQuantity || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => setEditingProduct(product)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                      <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Product</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm">Name</label>
                <input className="w-full border border-slate-300 p-2 rounded mt-1" value={newProduct.name || ''} onChange={e => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                  setNewProduct({...newProduct, name, slug});
                }} />
              </div>
              <div>
                <label className="block text-sm">Slug</label>
                <input className="w-full border border-slate-300 p-2 rounded mt-1" value={newProduct.slug || ''} onChange={e => setNewProduct({...newProduct, slug: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm">Description</label>
                <textarea className="w-full border border-slate-300 p-2 rounded mt-1" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm">Price (USD)</label>
                  <input type="number" className="w-full border border-slate-300 p-2 rounded mt-1" value={newProduct.price?.amount || 0} onChange={e => setNewProduct({...newProduct, price: { amount: parseFloat(e.target.value) || 0, currency: 'USD' }})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm">Stock Quantity</label>
                  <input type="number" className="w-full border border-slate-300 p-2 rounded mt-1" value={newProduct.stockQuantity || 0} onChange={e => setNewProduct({...newProduct, stockQuantity: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div>
                <label className="block text-sm">Image URL</label>
                <input className="w-full border border-slate-300 p-2 rounded mt-1" value={newProduct.imageUrl || ''} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm">Status</label>
                <select className="w-full border border-slate-300 p-2 rounded mt-1" value={newProduct.status || 'ACTIVE'} onChange={e => setNewProduct({...newProduct, status: e.target.value as ProductStatus})}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded" disabled={creating}>Cancel</button>
              <button onClick={async () => {
                setCreating(true);
                try {
                  const token = await auth.currentUser?.getIdToken();
                  const res = await fetch('/api/admin/v1/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(newProduct)
                  });
                  if (!res.ok) throw new Error('Failed to create product');
                  setShowCreate(false);
                  fetchProducts();
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

      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Product</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm">Name</label>
                <input className="w-full border border-slate-300 p-2 rounded mt-1" value={editingProduct.name || ''} onChange={e => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                  setEditingProduct({...editingProduct, name, slug});
                }} />
              </div>
              <div>
                <label className="block text-sm">Slug</label>
                <input className="w-full border border-slate-300 p-2 rounded mt-1" value={editingProduct.slug || ''} onChange={e => setEditingProduct({...editingProduct, slug: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm">Description</label>
                <textarea className="w-full border border-slate-300 p-2 rounded mt-1" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm">Price (USD)</label>
                  <input type="number" className="w-full border border-slate-300 p-2 rounded mt-1" value={editingProduct.price?.amount || 0} onChange={e => setEditingProduct({...editingProduct, price: { amount: parseFloat(e.target.value) || 0, currency: 'USD' }})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm">Stock Quantity</label>
                  <input type="number" className="w-full border border-slate-300 p-2 rounded mt-1" value={editingProduct.stockQuantity || 0} onChange={e => setEditingProduct({...editingProduct, stockQuantity: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div>
                <label className="block text-sm">Image URL</label>
                <input className="w-full border border-slate-300 p-2 rounded mt-1" value={editingProduct.imageUrl || ''} onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm">Status</label>
                <select className="w-full border border-slate-300 p-2 rounded mt-1" value={editingProduct.status || 'ACTIVE'} onChange={e => setEditingProduct({...editingProduct, status: e.target.value as ProductStatus})}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => setEditingProduct(null)} className="px-4 py-2 border rounded" disabled={updating}>Cancel</button>
              <button onClick={async () => {
                setUpdating(true);
                try {
                  const token = await auth.currentUser?.getIdToken();
                  const res = await fetch(`/api/admin/v1/products/${editingProduct.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(editingProduct)
                  });
                  if (!res.ok) throw new Error('Failed to update product');
                  setEditingProduct(null);
                  fetchProducts();
                } catch (err: any) {
                  alert(err.message);
                } finally {
                  setUpdating(false);
                }
              }} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={updating}>
                {updating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
