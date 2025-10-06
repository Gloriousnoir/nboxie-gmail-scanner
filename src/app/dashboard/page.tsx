'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Deal } from '@/types';

export const dynamic = 'force-dynamic';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? user.email : 'no user');
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('User available, fetching deals for:', user.email);
      fetchDeals();
    }
  }, [user]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.log('No user available for fetchDeals');
        setDeals([]);
        return;
      }
      
      const token = await user.getIdToken();
      console.log('Fetching deals with token:', token ? 'present' : 'missing');
      
      const response = await fetch('/api/deals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Deals API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Deals API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Deals API data:', data);
      setDeals(data.deals || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!user) return;
    
    try {
      setScanning(true);
      const token = await user.getIdToken();
      
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        await fetchDeals(); // Refresh deals after scanning
      }
    } catch (error) {
      console.error('Error scanning Gmail:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'New': return 'bg-purple-100 text-purple-800';
      case 'In Progress': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-yellow-100 text-yellow-800';
      case 'Declined': return 'bg-red-100 text-red-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'PR/Gifting': return 'bg-purple-100 text-purple-800';
      case 'UGC': return 'bg-indigo-100 text-indigo-800';
      case 'Brand Deal': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || deal.status === statusFilter;
    const matchesType = typeFilter === 'all' || deal.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-bold">Nboxie</span>
          </div>
          
          <nav className="space-y-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Main</div>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gray-700 text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Overview</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-700 text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Contacts</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-700 text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span>Deals</span>
              </a>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or type a command"
                  className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleScan}
                disabled={scanning}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {scanning ? 'Scanning...' : 'Scan Gmail'}
              </button>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Deals</p>
                <h1 className="text-2xl font-bold text-gray-900">My Deals</h1>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                    {filteredDeals.length} Deals
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Declined">Declined</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="Brand Deal">Brand Deal</option>
                <option value="UGC">UGC</option>
                <option value="PR/Gifting">PR/Gifting</option>
              </select>
            </div>
          </div>

          {/* Deals Table */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading deals...</p>
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No deals found. Try scanning your Gmail!</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Compensation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDeals.map((deal) => (
                      <tr 
                        key={deal.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedDeal(deal)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {deal.brand.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{deal.subject}</div>
                              <div className="text-sm text-gray-500">{deal.brand}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{deal.brand}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(deal.type)}`}>
                            {deal.type || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{deal.compensation || 'Not specified'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deal.status)}`}>
                            {deal.status || 'New'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(deal.confidence || 0) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-900">
                              {Math.round((deal.confidence || 0) * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deal Details Sidebar */}
      {selectedDeal && (
        <div className="w-96 bg-white border-l border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Deal Details</h3>
            <button
              onClick={() => setSelectedDeal(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Subject</label>
              <p className="text-sm text-gray-900">{selectedDeal.subject}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Brand</label>
              <p className="text-sm text-gray-900">{selectedDeal.brand}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedDeal.type)}`}>
                {selectedDeal.type || 'Unknown'}
              </span>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDeal.status)}`}>
                {selectedDeal.status || 'New'}
              </span>
            </div>
            
            {selectedDeal.compensation && (
              <div>
                <label className="text-sm font-medium text-gray-500">Compensation</label>
                <p className="text-sm text-gray-900">{selectedDeal.compensation}</p>
              </div>
            )}
            
            {selectedDeal.deliverables && (
              <div>
                <label className="text-sm font-medium text-gray-500">Deliverables</label>
                <p className="text-sm text-gray-900">{selectedDeal.deliverables}</p>
              </div>
            )}
            
            {selectedDeal.deadline && (
              <div>
                <label className="text-sm font-medium text-gray-500">Deadline</label>
                <p className="text-sm text-gray-900">{selectedDeal.deadline}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-500">Confidence</label>
              <div className="flex items-center mt-1">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(selectedDeal.confidence || 0) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-900">
                  {Math.round((selectedDeal.confidence || 0) * 100)}%
                </span>
              </div>
            </div>
            
            {selectedDeal.body && (
              <div>
                <label className="text-sm font-medium text-gray-500">Email Content</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-xs text-gray-700">{selectedDeal.body}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;