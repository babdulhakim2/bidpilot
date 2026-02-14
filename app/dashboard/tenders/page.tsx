'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useStore, formatNaira, daysUntil, toTitleCase } from '@/lib/store';
import { ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import TenderModal from '@/components/TenderModal';

const CATEGORIES = ['All', 'Construction', 'ICT', 'Consultancy', 'Supplies', 'Healthcare'];

export default function TendersPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { selectedTenderId, setSelectedTenderId } = useStore();

  const tenders = useQuery(api.tenders.list) ?? [];
  const selectedTender = tenders.find((t: any) => t._id === selectedTenderId);

  const filteredTenders = selectedCategory === 'All' 
    ? tenders 
    : tenders.filter((t: any) => t.category === selectedCategory);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'qualified': return 'bg-emerald-100 text-emerald-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      default: return 'bg-red-100 text-red-700';
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Browse Opportunities</h1>
        <p className="text-gray-600 mt-1">{tenders.length} opportunities available</p>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4">
        {CATEGORIES.map((cat) => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              cat === selectedCategory ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredTenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-4" />
          <p className="text-gray-500">Loading tenders...</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4 w-full">
          {filteredTenders.map((tender: any) => (
            <div 
              key={tender._id}
              onClick={() => setSelectedTenderId(tender._id)}
              className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 active:bg-gray-50 transition-colors cursor-pointer touch-manipulation w-full min-w-0"
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(tender.status)}`}>
                  {tender.category}
                </span>
                {daysUntil(tender.deadline) > 0 && (
                  <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">{daysUntil(tender.deadline)}d left</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{toTitleCase(tender.title)}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{toTitleCase(tender.organization)}</p>
              {tender.source && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] sm:text-xs text-gray-400">Source: {tender.source}</span>
                  {tender.sourceUrl && (
                    <a 
                      href={tender.sourceUrl} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between">
                {tender.budget > 0 ? (
                  <span className="font-display font-bold text-primary-600 text-sm sm:text-base">{formatNaira(tender.budget)}</span>
                ) : (
                  <span className="text-xs text-gray-400">Budget TBD</span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTender && (
        <TenderModal 
          tender={selectedTender} 
          onClose={() => setSelectedTenderId(null)} 
        />
      )}
    </>
  );
}
