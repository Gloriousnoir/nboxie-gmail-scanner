import React from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Deal } from '@/types';

interface DealCardProps {
  deal: Deal;
  onStatusChange: (dealId: string, status: string) => void;
  onDelete: (dealId: string) => void;
}

const DealCard: React.FC<DealCardProps> = ({ deal, onStatusChange, onDelete }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Declined': return 'bg-red-100 text-red-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PR Gift': return 'bg-purple-100 text-purple-800';
      case 'UGC': return 'bg-indigo-100 text-indigo-800';
      case 'Brand Deal': return 'bg-green-100 text-green-800';
      case 'Sponsorship': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{deal.subject}</h3>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deal.status)}`}>
            {deal.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(deal.type)}`}>
            {deal.type}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-600 w-20">Brand:</span>
          <span className="text-sm text-gray-900">{deal.brand}</span>
        </div>
        
        {deal.compensation && (
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 w-20">Value:</span>
            <span className="text-sm text-gray-900 font-semibold">
              ${deal.compensation.toLocaleString()}
            </span>
          </div>
        )}

        {deal.deliverables.length > 0 && (
          <div className="flex items-start">
            <span className="text-sm font-medium text-gray-600 w-20">Deliverables:</span>
            <div className="text-sm text-gray-900">
              {deal.deliverables.map((deliverable, index) => (
                <span key={index} className="inline-block bg-gray-100 rounded px-2 py-1 mr-1 mb-1">
                  {deliverable}
                </span>
              ))}
            </div>
          </div>
        )}

        {deal.deadline && (
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 w-20">Deadline:</span>
            <span className="text-sm text-gray-900">{deal.deadline}</span>
          </div>
        )}

        {deal.paymentTerms && (
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 w-20">Payment:</span>
            <span className="text-sm text-gray-900">{deal.paymentTerms}</span>
          </div>
        )}

        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-600 w-20">Confidence:</span>
          <span className={`text-sm font-semibold ${getConfidenceColor(deal.confidence)}`}>
            {Math.round(deal.confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <select
            value={deal.status}
            onChange={(e) => onStatusChange(deal.id, e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Declined">Declined</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
        
        <button
          onClick={() => onDelete(deal.id)}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default DealCard;

