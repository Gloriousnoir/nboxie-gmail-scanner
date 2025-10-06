'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Deal } from '@/types';

export const dynamic = 'force-dynamic';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        fetchDeals();
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/deals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDeals(data.deals || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to view your deals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Deals Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome, {user.email}</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading deals...</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No deals found. Try scanning your Gmail!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Deals ({deals.length})</h2>
            <div className="space-y-4">
              {deals.map((deal) => (
                <div key={deal.id} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{deal.subject}</h3>
                  <p className="text-sm text-gray-600">Brand: {deal.brand}</p>
                  <p className="text-sm text-gray-600">Type: {deal.type}</p>
                  {deal.compensation && (
                    <p className="text-sm text-gray-600">Compensation: {deal.compensation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;