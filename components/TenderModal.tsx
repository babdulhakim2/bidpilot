'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useUser';
import { formatNaira, daysUntil, toTitleCase } from '@/lib/store';
import { 
  X, Check, Building2, MapPin, ExternalLink, Bookmark, Sparkles, Loader2
} from 'lucide-react';

interface TenderModalProps {
  tender: any;
  onClose: () => void;
}

export default function TenderModal({ tender, onClose }: TenderModalProps) {
  const { userId } = useCurrentUser();
  const [generating, setGenerating] = useState(false);
  
  const createProposal = useMutation(api.proposals.create);
  const generateProposal = useMutation(api.proposals.generate);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'qualified': return 'bg-emerald-100 text-emerald-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      default: return 'bg-red-100 text-red-700';
    }
  };

  const handleGenerateProposal = async () => {
    if (!userId) return;
    setGenerating(true);
    try {
      const proposalId = await createProposal({
        userId,
        tenderId: tender._id,
        tenderTitle: tender.title,
      });
      await generateProposal({ id: proposalId });
      onClose();
      // Could redirect to proposals or show toast
    } catch (error) {
      console.error('Failed to generate proposal:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white pt-4 pb-2 px-6 border-b border-gray-100 z-10">
          <div className="flex items-center justify-between">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 pt-4 pb-24 lg:pb-6">
          <div className="flex items-start justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tender.status)}`}>
              {tender.status === 'qualified' ? '✓ Qualified' : 
               tender.status === 'partial' ? '⚠ Partial Match' : '✗ Low Match'}
            </span>
            {daysUntil(tender.deadline) > 0 && (
              <span className="text-sm text-gray-500">{daysUntil(tender.deadline)} days left</span>
            )}
          </div>
          
          <h2 className="font-display text-xl font-bold text-gray-900 mb-2">
            {toTitleCase(tender.title)}
          </h2>
          
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">{toTitleCase(tender.organization)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{tender.location}</span>
          </div>
          
          {tender.source && (
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Source: {tender.source}</span>
              {tender.sourceUrl && (
                <a 
                  href={tender.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 underline"
                >
                  View Original
                </a>
              )}
            </div>
          )}
          
          {tender.budget > 0 && (
            <div className="font-display text-2xl font-bold text-primary-600 mb-4">
              {formatNaira(tender.budget)}
            </div>
          )}
          
          <p className="text-gray-600 mb-6">{tender.description}</p>
          
          <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
          <div className="space-y-2 mb-6">
            {tender.requirements?.map((req: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-gray-700">{req}</span>
              </div>
            ))}
            {tender.missing?.map((miss: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-amber-400" />
                <span className="text-sm text-amber-700">{miss} (missing)</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2">
              <Bookmark className="w-4 h-4" /> Save
            </button>
            <button 
              onClick={handleGenerateProposal}
              disabled={generating}
              className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Generate Proposal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
