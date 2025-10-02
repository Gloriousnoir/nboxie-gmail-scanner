'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Deal } from '@/types';
import DealCard from '@/components/DealCard';

const Dashboard: React.FC = () => {
  const { data: session, status } = useSession();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});

  useEffect(() => {
    if (session) {
      fetchDeals();
    }
  }, [session, filter]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.type) params.append('type', filter.type);
      
      const response = await fetch(`/api/deals?${params}`);
      const data = await response.json();
      setDeals(data.deals || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      const response = await fetch('/api/scan', {
        method: 'POST',
      });
      
      if (response.ok) {
        await fetchDeals(); // Refresh deals after scan
      } else {
        console.error('Scan failed');
      }
    } catch (error) {
      console.error('Error scanning:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleStatusChange = async (dealId: string, status: string) => {
    try {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setDeals(deals.map(deal => 
          deal.id === dealId ? { ...deal, status: status as any } : deal
        ));
      }
    } catch (error) {
      console.error('Error updating deal status:', error);
    }
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) {
      return;
    }

    try {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeals(deals.filter(deal => deal.id !== dealId));
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Nboxie</h1>
            <p className="text-gray-600 mb-6">
              Scan your Gmail for brand deals, sponsorships, and PR opportunities
            </p>
            <button
              onClick={() => window.location.href = '/api/auth/signin'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: deals.length,
    new: deals.filter(d => d.status === 'New').length,
    inProgress: deals.filter(d => d.status === 'In Progress').length,
    completed: deals.filter(d => d.status === 'Completed').length,
    totalValue: deals.reduce((sum, deal) => sum + (deal.compensation || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nboxie Dashboard</h1>
              <p className="text-gray-600">Welcome back, {session.user?.email}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleScan}
                disabled={scanning}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanning ? 'Scanning...' : 'Scan Gmail'}
              </button>
              <button
                onClick={() => window.location.href = '/api/auth/signout'}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Deals</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            <div className="text-sm text-gray-600">New</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">
              ${stats.totalValue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex gap-4">
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Declined">Declined</option>
              <option value="Archived">Archived</option>
            </select>
            
            <select
              value={filter.type || ''}
              onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="PR Gift">PR Gift</option>
              <option value="UGC">UGC</option>
              <option value="Brand Deal">Brand Deal</option>
              <option value="Sponsorship">Sponsorship</option>
            </select>
          </div>
        </div>

        {/* Deals Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading deals...</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📧</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
            <p className="text-gray-600 mb-4">
              Click "Scan Gmail" to find brand deals and opportunities in your inbox
            </p>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {scanning ? 'Scanning...' : 'Scan Gmail'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

