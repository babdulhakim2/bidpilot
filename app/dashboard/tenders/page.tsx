'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useStore, formatNaira, toTitleCase } from '@/lib/store';
import { ChevronRight, ExternalLink, Loader2, Check, X } from 'lucide-react';
import TenderModal from '@/components/TenderModal';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { formatDeadline, getDeadlineColor, timeAgo } from '@/lib/timeUtils';

export default function TendersPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { selectedTenderId, setSelectedTenderId } = useStore();

  const tenders = useQuery(api.tenders.list) ?? [];
  const selectedTender = tenders.find((t: any) => t._id === selectedTenderId);

  const filteredTenders = selectedCategories.length === 0 
    ? tenders 
    : tenders.filter((t: any) => selectedCategories.includes(t.category?.toLowerCase()));

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(c => c !== catId) 
        : [...prev, catId]
    );
  };

  const clearFilters = () => setSelectedCategories([]);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Browse Opportunities</h1>
        <p className="text-gray-600 mt-1">{filteredTenders.length} opportunities available</p>
      </div>

      {/* Multi-select Filter Pills */}
      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.includes(cat.id);
            return (
              <button 
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                {cat.label}
              </button>
            );
          })}
        </div>
        {selectedCategories.length > 0 && (
          <button 
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Clear filters ({selectedCategories.length})
          </button>
        )}
      </div>

      {filteredTenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          {tenders.length === 0 ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-500">Loading tenders...</p>
            </>
          ) : (
            <>
              <p className="text-gray-500 mb-2">No tenders match your filters</p>
              <button onClick={clearFilters} className="text-primary-600 font-medium">
                Clear filters
              </button>
            </>
          )}
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
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category badge - brand green */}
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 flex-shrink-0">
                    {getCategoryLabel(tender.category) || toTitleCase(tender.category)}
                  </span>
                  {/* Time added */}
                  {tender._creationTime && (
                    <span className="text-[10px] sm:text-xs text-gray-400">
                      {timeAgo(tender._creationTime)}
                    </span>
                  )}
                </div>
                {/* Deadline with color */}
                <span className={`text-xs sm:text-sm font-medium flex-shrink-0 ${getDeadlineColor(tender.deadline)}`}>
                  {formatDeadline(tender.deadline)}
                </span>
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
