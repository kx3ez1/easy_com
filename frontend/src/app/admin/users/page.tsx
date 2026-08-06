'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import Pagination from '../components/Pagination';
import type { UserProfile } from '../../../models/types/user.types';
import Spinner from '../components/Spinner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);


  const [error, setError] = useState<string | null>(null);
  // Edit User State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/admin/v1/users?limit=${limit}&offset=${offset}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch users');
        const json = await res.json();
        setUsers(json.data.results);
        setTotal(json.data.total);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/v1/users/${id}/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchUsers();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchUsers();
      });
      return () => unsubscribe();
    }
  }, [offset, limit]);

  // User Orders Modal State
  const [selectedUserForOrders, setSelectedUserForOrders] = useState<UserProfile | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchUserOrders = async (userId: string) => {
    setLoadingOrders(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/v1/orders?userId=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch user orders');
      const json = await res.json();
      setUserOrders(json.data.results || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOpenUserOrders = (user: UserProfile) => {
    setSelectedUserForOrders(user);
    fetchUserOrders(user.id);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Manage Users</h1>
      
      {error && <div className="text-red-500 mb-4">Error: {error}</div>}
      
      {loading ? (
        <Spinner size="lg" label="Loading users..." className="my-16" />
      ) : users.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-medium text-slate-500">No users found</h2>
          <p className="text-slate-400 mt-2">There are currently 0 users registered.</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      <button 
                        onClick={() => handleOpenUserOrders(user)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-left"
                        title="Click to view user's orders"
                      >
                        {user.email}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <button 
                        onClick={() => handleOpenUserOrders(user)}
                        className="hover:text-blue-600 hover:underline text-left"
                        title="Click to view user's orders"
                      >
                        {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'N/A'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleOpenUserOrders(user)} 
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Orders
                      </button>
                      <button onClick={() => setEditingUser(user)} className="text-blue-600 hover:text-blue-900 mr-3">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900">
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

      {/* User Orders Modal */}
      {selectedUserForOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Orders for {selectedUserForOrders.firstName ? `${selectedUserForOrders.firstName} ${selectedUserForOrders.lastName || ''}` : selectedUserForOrders.email}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">User ID: {selectedUserForOrders.id}</p>
              </div>
              <button 
                onClick={() => setSelectedUserForOrders(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loadingOrders ? (
                <Spinner size="md" label="Loading user orders..." className="my-8" />
              ) : userOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-base font-medium">No orders found for this user.</p>
                  <p className="text-xs text-slate-400 mt-1">This user has not placed any orders yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500 font-medium">Found {userOrders.length} order(s)</div>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Order ID</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Total</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Payment</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {userOrders.map((ord: any) => (
                          <tr key={ord.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-xs font-mono text-slate-600">{ord.id}</td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-900">
                              ${ord.totalAmount?.amount !== undefined ? Number(ord.totalAmount.amount).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                                {ord.status || 'PENDING'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ord.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {ord.paymentStatus || 'PENDING'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <a 
                href={`/admin/orders?userId=${encodeURIComponent(selectedUserForOrders.id)}`}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                Open in Full Orders Page →
              </a>
              <button 
                onClick={() => setSelectedUserForOrders(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm">First Name</label>
                <input className="w-full border border-slate-300 p-2 rounded mt-1" value={editingUser.firstName || ''} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm">Last Name</label>
                <input className="w-full border border-slate-300 p-2 rounded mt-1" value={editingUser.lastName || ''} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm">Phone Number</label>
                <input className="w-full border border-slate-300 p-2 rounded mt-1" value={editingUser.phoneNumber || ''} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded" disabled={updating}>Cancel</button>
              <button onClick={async () => {
                setUpdating(true);
                try {
                  const token = await auth.currentUser?.getIdToken();
                  const res = await fetch(`/api/admin/v1/users/${editingUser.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      firstName: editingUser.firstName,
                      lastName: editingUser.lastName,
                      phoneNumber: editingUser.phoneNumber
                    })
                  });
                  if (!res.ok) throw new Error('Failed to update user');
                  setEditingUser(null);
                  fetchUsers();
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
