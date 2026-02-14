'use client';

import { useStore, formatNaira, daysUntil, getMatchColor } from '@/lib/store';
import { ArrowLeft, Bookmark, Pin, Check, AlertTriangle, HelpCircle, Download, Sparkles, Loader2 } from 'lucide-react';
import { normalizeText, toSentenceCase } from '@/lib/textUtils';

export default function TenderDetail() {
  const { selectedTender, setShowTenderDetail, generateProposal, isGenerating, documents, toggleSaveTender } = useStore();

  if (!selectedTender) return null;

  const days = daysUntil(selectedTender.deadline);

  const checkRequirement = (req: string) => {
    const docNames = documents.map(d => d.name.toLowerCase());
    const reqLower = req.toLowerCase();
    return docNames.some(name => 
      name.includes(reqLower.split(' ')[0]) || 
      (reqLower.includes('cac') && name.includes('cac')) ||
      (reqLower.includes('tax') && name.includes('tax')) ||
      (reqLower.includes('profile') && name.includes('profile')) ||
      (reqLower.includes('contract') && name.includes('contract'))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <button 
            onClick={() => setShowTenderDetail(false)}
            className="p-2 hover:bg-gray-100 rounded-xl transition flex items-center gap-1 text-gray-600"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button 
            onClick={() => toggleSaveTender(selectedTender.id)}
            className={`p-2 rounded-xl transition flex items-center gap-1 ${selectedTender.saved ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            {selectedTender.saved ? (
              <>
                <Bookmark className="w-4 h-4 fill-current" /> Saved
              </>
            ) : (
              <>
                <Pin className="w-4 h-4" /> Save
              </>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {normalizeText(selectedTender.title)}
          </h1>
          <p className="text-gray-600 mb-6">{normalizeText(selectedTender.organization)}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-gray-900">{formatNaira(selectedTender.budget)}</div>
              <div className="text-xs text-gray-500">Budget</div>
            </div>
            <div className={`rounded-xl p-4 text-center ${days <= 3 ? 'bg-red-50' : days <= 7 ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <div className={`text-xl font-bold ${days <= 3 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-gray-900'}`}>
                {days} days
              </div>
              <div className="text-xs text-gray-500">Deadline</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getMatchColor(selectedTender.matchScore)}`}>
                {selectedTender.matchScore}%
              </span>
              <div className="text-xs text-gray-500 mt-1">Match</div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{toSentenceCase(selectedTender.description)}</p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <span className="text-gray-500">Location:</span>
              <div className="font-medium text-gray-900">{normalizeText(selectedTender.location)}</div>
            </div>
            <div>
              <span className="text-gray-500">Category:</span>
              <div className="font-medium text-gray-900">{normalizeText(selectedTender.category)}</div>
            </div>
            <div>
              <span className="text-gray-500">Source:</span>
              <div className="font-medium text-gray-900">{normalizeText(selectedTender.source)}</div>
            </div>
            <div>
              <span className="text-gray-500">Published:</span>
              <div className="font-medium text-gray-900">{selectedTender.publishedAt}</div>
            </div>
          </div>

          {/* Requirements */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Requirements Checklist</h3>
            <div className="space-y-2">
              {selectedTender.requirements.map((req) => {
                const hasDoc = checkRequirement(req);
                const isMissing = selectedTender.missing.includes(req);
                return (
                  <div 
                    key={req}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      hasDoc ? 'bg-emerald-50 border-emerald-200' : 
                      isMissing ? 'bg-amber-50 border-amber-200' : 
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      hasDoc ? 'bg-emerald-500 text-white' : 
                      isMissing ? 'bg-amber-400 text-white' : 
                      'bg-gray-300 text-white'
                    }`}>
                      {hasDoc ? <Check className="w-3.5 h-3.5" /> : isMissing ? <AlertTriangle className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
                    </span>
                    <span className={`flex-1 ${hasDoc ? 'text-emerald-800' : isMissing ? 'text-amber-800' : 'text-gray-600'}`}>
                      {req}
                    </span>
                    {hasDoc && <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Uploaded</span>}
                    {isMissing && <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Missing</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Download Tender
            </button>
            <button 
              onClick={() => generateProposal(selectedTender.id)}
              disabled={isGenerating}
              className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Proposal
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
