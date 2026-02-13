'use client';

import { Tender, formatNaira, daysUntil, getMatchColor, getMatchBg, useStore } from '@/lib/store';
import { Bookmark, Pin, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';

interface TenderCardProps {
  tender: Tender;
  compact?: boolean;
}

export default function TenderCard({ tender, compact = false }: TenderCardProps) {
  const { selectTender, toggleSaveTender, generateProposal, isGenerating } = useStore();
  const days = daysUntil(tender.deadline);

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await generateProposal(tender.id);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveTender(tender.id);
  };

  return (
    <div 
      onClick={() => selectTender(tender)}
      className={`bg-white rounded-2xl border p-4 sm:p-5 ${getMatchBg(tender.matchScore)} hover:shadow-lg transition cursor-pointer active:scale-[0.99]`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white ${getMatchColor(tender.matchScore)}`}>
              {tender.matchScore}% Match
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tender.category}</span>
            {tender.saved && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <Bookmark className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{tender.title}</h3>
          <p className="text-sm text-gray-600 truncate">{tender.organization}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-sm font-medium ${days <= 3 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-gray-900'}`}>
            {days} days
          </div>
          <div className="text-xs text-gray-500">deadline</div>
        </div>
      </div>

      {!compact && (
        <>
          {tender.missing.length > 0 && (
            <div className="mb-3 p-2 bg-amber-100/50 rounded-lg border border-amber-200">
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                Missing: {tender.missing.join(', ')}
              </span>
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-gray-900">{formatNaira(tender.budget)}</span>
          <span className="text-sm text-gray-500 ml-1">budget</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            className={`p-2 rounded-xl transition ${tender.saved ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {tender.saved ? <Bookmark className="w-5 h-5 fill-current" /> : <Pin className="w-5 h-5" />}
          </button>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Proposal
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
