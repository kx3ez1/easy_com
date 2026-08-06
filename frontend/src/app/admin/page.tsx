'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';

interface AnalyticsData {
  totalRevenue: number;
  completedOrders: number;
  totalOrders: number;
  totalUsers: number;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin/v1/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (auth.currentUser) {
      fetchAnalytics();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          fetchAnalytics();
        }
      });
      return () => unsubscribe();
    }
  }, []);

  if (loading) {
    return <div className="text-xl">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-xl">Error: {error}</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Revenue</h2>
          <p className="text-3xl font-bold text-slate-900">${(data?.totalRevenue || 0).toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Completed Orders</h2>
          <p className="text-3xl font-bold text-slate-900">{data?.completedOrders || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Orders</h2>
          <p className="text-3xl font-bold text-slate-900">{data?.totalOrders || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Users</h2>
          <p className="text-3xl font-bold text-slate-900">{data?.totalUsers || 0}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-64 flex items-center justify-center">
        <p className="text-slate-400 italic">Visual charts would go here (built with CSS grid/flex to avoid dependencies).</p>
      </div>
    </div>
  );
}
